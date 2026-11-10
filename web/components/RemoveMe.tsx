"use client";
import { useState } from "react";
import { type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api } from "@/lib/me";

export default function RemoveMe({ lang, slug }: { lang: Lang; slug: string }) {
  const t = d2(lang);
  const [open, setOpen] = useState(false);
  const [c, setC] = useState("");
  const [done, setDone] = useState(false);
  if (done) return <p className="hint">{t.removeSent}</p>;
  if (!open) return <button type="button" className="linklike" onClick={() => setOpen(true)}>{t.removeMe}</button>;
  return (
    <form className="form" onSubmit={async (e) => { e.preventDefault(); try { await api(`/api/v1/masters/${slug}/removal`, { body: { contact: c } }); setDone(true); } catch { /* */ } }}>
      <label>{t.removeContact}<input className="input" required minLength={3} value={c} onChange={(e) => setC(e.target.value)} /></label>
      <button type="submit" className="btn ghost">{t.removeSend}</button>
    </form>
  );
}
