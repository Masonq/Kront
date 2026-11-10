"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "./Icon";
import { apiLang, dict, tx, type Lang } from "@/lib/i18n";
import { sectionPhoto } from "@/lib/sections";
import { PICK, REQS, write, type Picked, type SentReq } from "@/lib/local";

type Opt = { slug: string; name: string };
type Group = { section: string; sectionSlug: string; items: Opt[] };

export default function RequestForm({ lang, services, districts, init, masters: initMasters }: {
  lang: Lang; services: Group[]; districts: Opt[];
  init: { service?: string; district?: string; q?: string }; masters: Picked[];
}) {
  const t = dict(lang);
  const [step, setStep] = useState(0);
  const [masters, setMasters] = useState<Picked[]>(initMasters);
  const [f, setF] = useState({
    service: init.service || "", description: init.q || "", district: init.district || "", when: "asap", budget: "",
    contact_name: "", contact: "", urgent: false,
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "fail">("idle");
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  const group = services.find((g) => g.items.some((o) => o.slug === f.service));
  const svcName = group?.items.find((o) => o.slug === f.service)?.name || "";
  const distName = districts.find((d) => d.slug === f.district)?.name || "";
  const photo = sectionPhoto(group?.sectionSlug) || "/demo/hero.jpg";

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
        body: JSON.stringify({ ...f, masters: masters.map((m) => m.slug), master: masters.length === 1 ? masters[0].slug : null, lang: apiLang(lang) }),
      });
      if (!r.ok) { setState("fail"); return; }
      const j = await r.json();
      const rec: SentReq = { id: j.id, at: new Date().toISOString(), service: f.service, serviceName: svcName, section: group?.sectionSlug || "",
        district: distName, when: f.when, description: f.description.trim(), masters };
      let prev: SentReq[] = [];
      try { prev = JSON.parse(localStorage.getItem(REQS) || "[]"); } catch { /* пусто */ }
      write(REQS, [rec, ...prev].slice(0, 50));
      write(PICK, []);
      setState("done");
    } catch { setState("fail"); }
  };

  const next = (e: React.FormEvent) => { e.preventDefault(); if (step < 2) { if (validate(step)) setStep(step + 1); } else submit(); };

  return (
    <>
      <section className="nhero short">
        <img src={photo} alt="" />
        <div className="nhero-in">
          <h1>{state === "done" ? t.sent : t.reqTitle}</h1>
          <span className="role">{tx(lang, svcName) || t.pickHint}</span>
        </div>
      </section>

      <div className="sheet">
        {state === "done" ? (
          <div className="done">
            <span className="ok"><Icon name="check" size={26} stroke={2.6} /></span>
            <p className="muted" style={{ margin: 0, maxWidth: 520 }}>{t.sentText}</p>
            <div className="chips">
              <Link href={`/${lang}/zahtevi`} className="btn">{t.ordersTitle}</Link>
              <Link href={`/${lang}/usluge/${f.service}${f.district ? `/${f.district}` : ""}`} className="btn ghost">{t.toMasters}</Link>
            </div>
          </div>
        ) : (
          <div className="req-grid">
            <form className="form" onSubmit={next} noValidate>
              <div className="steps-pills" role="list">
                {t.reqStep.map((s, i) => (
                  <button key={s} type="button" role="listitem" className={`chip${i === step ? " on" : ""}`} aria-current={i === step ? "step" : undefined}
                    onClick={() => { if (i < step || validate(step)) setStep(i < step ? i : Math.min(step + 1, i)); }}>
                    <span className="n">{i < step ? <Icon name="check" size={12} stroke={3} /> : i + 1}</span>{s}
                  </button>
                ))}
              </div>

              {step === 0 && (<>
                <label>{t.reqWhat}
                  <select value={f.service} onChange={(e) => set("service", e.target.value)} aria-invalid={!!err.service}>
                    <option value="">—</option>
                    {services.map((g) => (
                      <optgroup key={g.sectionSlug} label={tx(lang, g.section)}>
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
                <fieldset className="fs">
                  <legend>{t.reqWhen}</legend>
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
                <button type="submit" className="btn lg" disabled={state === "sending"}>
                  {step < 2 ? <>{t.next}<Icon name="right" size={18} stroke={2} /></> : state === "sending" ? t.sending : <>{t.send}<Icon name="send" size={18} /></>}
                </button>
              </div>
            </form>

            <aside className="order-card" aria-label={t.reqSummary}>
              <div className="order-inner">
                <div className="row">
                  <img src={photo} alt="" className="thumb" />
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="status-pill">{t.reqSummary}</span>
                    <b className="oc-title">{tx(lang, svcName) || "—"}</b>
                    <span className="oc-sub">{f.description ? f.description.slice(0, 60) + (f.description.length > 60 ? "…" : "") : t.reqDescPh}</span>
                  </div>
                </div>
              </div>
              <div className="order-cols">
                <div>
                  <span>{t.reqMasters}</span>
                  {masters.length ? (
                    <span className="avas">
                      {masters.map((m) => (
                        <button key={m.slug} type="button" className="ava-x" onClick={() => setMasters(masters.filter((x) => x.slug !== m.slug))} title={`${tx(lang, m.name)} · ${t.pickRemove}`} aria-label={`${tx(lang, m.name)}: ${t.pickRemove}`}>
                          {m.photo ? <img src={m.photo} alt="" /> : m.name.split(/\s+/).map((x) => x[0]).join("").slice(0, 2)}
                        </button>
                      ))}
                    </span>
                  ) : <small className="muted">{t.reqAny}</small>}
                </div>
                <div>
                  <span>{t.reqWhere}</span>
                  <b>{tx(lang, distName) || <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>{t.notChosen}</span>}</b>
                  <small className="muted">{t.whenOpts[f.when]}</small>
                </div>
              </div>
              <p className="fine">{lang === "ru" ? "Оплата мастеру напрямую после работы. Kront не берёт комиссию." : tx(lang, "Plaćanje majstoru direktno posle posla. Kront ne uzima proviziju.")}</p>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
