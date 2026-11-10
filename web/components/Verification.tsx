"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "./Icon";
import NeedLogin from "./NeedLogin";
import { apiLang, type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, uploadPhoto, useMe } from "@/lib/me";

type V = { level: number; kyc: boolean; kyc_status: string; orders: number; rating: number; docs: { id: number; kind: string; file: string; status: string; note: string }[] };

export default function Verification({ lang }: { lang: Lang }) {
  const t = d2(lang);
  const sp = useSearchParams();
  const { me, loaded } = useMe();
  const [v, setV] = useState<V | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (sp.get("kyc")) await api("/api/v1/me/master/verification/kyc/refresh", { method: "POST" }).catch(() => {});
    api<V>("/api/v1/me/master/verification").then(setV).catch(() => setV(null));
  }, [sp]);
  useEffect(() => { if (me) load(); }, [me, load]);
  if (!loaded) return <div className="nhero tall skeleton" />;
  if (!me) return <NeedLogin lang={lang} title={t.verifTitle} />;
  if (!v) return <div className="skeleton-line" />;

  const kyc = async () => {
    setBusy(true);
    try { const r = await api<{ url: string }>(`/api/v1/me/master/verification/kyc?lang=${apiLang(lang)}`, { method: "POST" }); window.location.href = r.url; } catch { setBusy(false); }
  };
  const doc = async (f: FileList | null) => {
    if (!f?.[0]) return;
    setBusy(true);
    try { const url = await uploadPhoto(f[0]); await api("/api/v1/me/master/verification/docs", { body: { file: url, kind: "license" } }); await load(); } catch { /* */ }
    setBusy(false);
  };
  const lastDoc = v.docs[0];
  const status = (done: boolean, pending?: boolean, rejected?: boolean) =>
    <span className={`lv-st${done ? " ok" : ""}`}>{done ? <><Icon name="check" size={13} stroke={3} />{t.lvDone}</> : pending ? t.lvPending : rejected ? t.lvRejected : ""}</span>;

  return (
    <>
      <section className="nhero short"><img src="/sec/dokumenti.jpg" alt="" /><div className="nhero-in"><h1>{t.verifTitle}</h1><span className="role">{t.verifSub}</span></div></section>
      <div className="sheet">
        <div className="levels">
          <div className={`lv${v.level >= 1 ? " done" : ""}`}>
            <span className="lv-ic"><Icon name="shield" size={22} /></span>
            <div className="lv-body"><b>1 · {t.lv1}</b><p>{t.lv1t}</p>
              {v.level < 1 && (v.kyc ? <button type="button" className="btn" disabled={busy} onClick={kyc}>{t.lv1btn}</button>
                : <span className="hint">{sp.get("kyc") ? t.kycWait : t.kycOff}</span>)}</div>
            {status(v.level >= 1, v.kyc_status === "In Review")}
          </div>
          <div className={`lv${v.level >= 2 ? " done" : ""}`}>
            <span className="lv-ic"><Icon name="doc" size={22} /></span>
            <div className="lv-body"><b>2 · {t.lv2}</b><p>{t.lv2t}</p>
              {lastDoc?.status === "rejected" && lastDoc.note && <span className="err">{lastDoc.note}</span>}
              {v.level < 2 && lastDoc?.status !== "pending" && <label className="btn ghost">{t.lv2btn}<input type="file" accept="image/*" hidden onChange={(e) => doc(e.target.files)} /></label>}</div>
            {status(v.level >= 2, lastDoc?.status === "pending", lastDoc?.status === "rejected")}
          </div>
          <div className={`lv${v.level >= 3 ? " done" : ""}`}>
            <span className="lv-ic"><Icon name="star" size={22} /></span>
            <div className="lv-body"><b>3 · {t.lv3}</b><p>{t.lv3t}</p>
              {v.level < 3 && <div className="bar"><span style={{ width: `${Math.min(100, v.orders * 10)}%` }} /></div>}
              {v.level < 3 && <span className="hint">{t.progress(Math.min(v.orders, 10))} · ★ {v.rating ? v.rating.toFixed(1).replace(".", ",") : "—"}</span>}</div>
            {status(v.level >= 3)}
          </div>
        </div>
      </div>
    </>
  );
}
