"use client";
import { useState } from "react";
import Icon from "./Icon";
import { apiLang, dict, tx, type Lang } from "@/lib/i18n";

export default function LeadForm({ lang, districts }: { lang: Lang; districts: { slug: string; name: string }[] }) {
  const t = dict(lang);
  const [f, setF] = useState({ name: "", contact: "", service: "", district: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "fail">("idle");
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = t.errRequired;
    if (f.contact.trim().length < 5) er.contact = t.errRequired;
    setErr(er);
    if (Object.keys(er).length) return;
    setState("sending");
    try {
      const r = await fetch("/api/v1/master-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, lang: apiLang(lang) }) });
      setState(r.ok ? "done" : "fail");
    } catch { setState("fail"); }
  };
  if (state === "done") return <div className="done"><span className="ok"><Icon name="check" size={26} stroke={2.6} /></span><p style={{ margin: 0 }}>{t.leadDone}</p></div>;
  return (
    <form className="form" onSubmit={send} noValidate>
      <h2 className="h2">{t.leadTitle}</h2>
      <div className="two">
        <label>{t.reqName}<input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" aria-invalid={!!err.name} />{err.name && <span className="err">{err.name}</span>}</label>
        <label>{t.reqContact}<input className="input" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="+381… / @username" autoComplete="tel" aria-invalid={!!err.contact} />{err.contact && <span className="err">{err.contact}</span>}</label>
      </div>
      <div className="two">
        <label>{t.leadService}<input className="input" value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} placeholder={t.leadServicePh} /></label>
        <label>{t.reqWhere}
          <select value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })}>
            <option value="">{t.districtAll}</option>
            {districts.map((d) => <option key={d.slug} value={d.slug}>{tx(lang, d.name)}</option>)}
          </select>
        </label>
      </div>
      {state === "fail" && <span className="err">{t.errSend}</span>}
      <div className="form-actions"><span /><button type="submit" className="btn lg" disabled={state === "sending"}>{state === "sending" ? t.sending : t.leadSend}</button></div>
    </form>
  );
}
