"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "./Icon";
import { apiLang, dict, tx, type Lang } from "@/lib/i18n";

type Opt = { slug: string; name: string };

export default function RequestForm({ lang, services, districts, init, masterName }: {
  lang: Lang; services: { section: string; items: Opt[] }[]; districts: Opt[];
  init: { service?: string; district?: string; master?: string; q?: string }; masterName?: string;
}) {
  const t = dict(lang);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    service: init.service || "", description: init.q || "", district: init.district || "", when: "asap", budget: "",
    contact_name: "", contact: "", urgent: false,
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "fail">("idle");
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!f.service) e.service = t.errRequired;
      if (f.description.trim().length < 10) e.description = t.errShort;
    }
    if (s === 1 && !f.district) e.district = t.errRequired;
    if (s === 2) {
      if (f.contact_name.trim().length < 2) e.contact_name = t.errRequired;
      if (f.contact.trim().length < 5) e.contact = t.errRequired;
    }
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate(2)) return;
    setState("sending");
    try {
      const r = await fetch("/api/v1/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, master: init.master || null, lang: apiLang(lang) === "ru" ? "ru" : "sr" }),
      });
      setState(r.ok ? "done" : "fail");
    } catch { setState("fail"); }
  };

  if (state === "done") {
    return (
      <div className="done">
        <span className="ok"><Icon name="check" size={26} stroke={2.6} /></span>
        <h2 className="h2">{t.sent}</h2>
        <p className="muted" style={{ margin: 0 }}>{t.sentText}</p>
        <Link href={`/${lang}/usluge/${f.service}${f.district ? `/${f.district}` : ""}`} className="btn">{t.toMasters}</Link>
      </div>
    );
  }

  return (
    <div className="req">
      <h1 className="h1">{t.reqTitle}</h1>
      {masterName && <p className="muted" style={{ margin: "8px 0 0" }}>{t.reqToMaster(tx(lang, masterName))}</p>}
      <div className="stepper" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className={i <= step ? "on" : ""} />)}</div>
      <p className="muted" style={{ margin: "0 0 14px", fontSize: 14 }}>{step + 1}/3 · {t.reqStep[step]}</p>

      <form className="form" onSubmit={(e) => { e.preventDefault(); if (step < 2) { if (validate(step)) setStep(step + 1); } else submit(); }} noValidate>
        {step === 0 && (<>
          <label>{t.reqWhat}
            <select value={f.service} onChange={(e) => set("service", e.target.value)} aria-invalid={!!err.service}>
              <option value="">—</option>
              {services.map((g) => (
                <optgroup key={g.section} label={tx(lang, g.section)}>
                  {g.items.map((o) => <option key={o.slug} value={o.slug}>{tx(lang, o.name)}</option>)}
                </optgroup>
              ))}
            </select>
            {err.service && <span className="err">{err.service}</span>}
          </label>
          <label>{t.reqDesc}
            <textarea className="textarea" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder={t.reqDescPh} aria-invalid={!!err.description} />
            {err.description && <span className="err">{err.description}</span>}
          </label>
        </>)}

        {step === 1 && (<>
          <label>{t.reqWhere}
            <select value={f.district} onChange={(e) => set("district", e.target.value)} aria-invalid={!!err.district}>
              <option value="">—</option>
              {districts.map((d) => <option key={d.slug} value={d.slug}>{tx(lang, d.name)}</option>)}
            </select>
            {err.district && <span className="err">{err.district}</span>}
          </label>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <legend style={{ fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 8 }}>{t.reqWhen}</legend>
            <div className="chips">
              {Object.entries(t.whenOpts).map(([k, v]) => (
                <button key={k} type="button" className={`chip${f.when === k ? " on" : ""}`} aria-pressed={f.when === k} onClick={() => set("when", k)}>{v}</button>
              ))}
            </div>
          </fieldset>
          <label>{t.reqBudget}
            <input className="input" value={f.budget} onChange={(e) => set("budget", e.target.value)} placeholder={t.reqBudgetPh} />
          </label>
          <label className="check"><input type="checkbox" checked={f.urgent} onChange={(e) => set("urgent", e.target.checked)} />{t.reqUrgent}</label>
        </>)}

        {step === 2 && (<>
          <label>{t.reqName}
            <input className="input" value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} autoComplete="given-name" aria-invalid={!!err.contact_name} />
            {err.contact_name && <span className="err">{err.contact_name}</span>}
          </label>
          <label>{t.reqContact}
            <input className="input" value={f.contact} onChange={(e) => set("contact", e.target.value)} placeholder="+381… / @username" autoComplete="tel" aria-invalid={!!err.contact} />
            {err.contact && <span className="err">{err.contact}</span>}
          </label>
          {state === "fail" && <span className="err">{t.errSend}</span>}
        </>)}

        <div className="form-actions">
          {step > 0 ? <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}><Icon name="left" size={18} stroke={2} />{t.back}</button> : <span />}
          <button type="submit" className="btn" disabled={state === "sending"}>
            {step < 2 ? <>{t.next}<Icon name="right" size={18} stroke={2} /></> : state === "sending" ? t.sending : <>{t.send}<Icon name="send" size={18} /></>}
          </button>
        </div>
      </form>
    </div>
  );
}
