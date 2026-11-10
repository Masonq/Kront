"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tx, type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, useMe, refreshMe, setMode } from "@/lib/me";

export default function Claim({ lang, token }: { lang: Lang; token: string }) {
  const t = d2(lang);
  const router = useRouter();
  const { me, loaded } = useMe();
  const [info, setInfo] = useState<{ slug: string; name: string } | null | undefined>(undefined);
  const [err, setErr] = useState("");
  useEffect(() => { api<{ slug: string; name: string }>(`/api/v1/claim/${token}`).then(setInfo).catch(() => setInfo(null)); }, [token]);
  const claim = async () => {
    try { await api(`/api/v1/claim/${token}`, { method: "POST" }); setMode("master"); await refreshMe(); router.push(`/${lang}/kabinet/profil`); }
    catch (e) { setErr((e as { status?: number }).status === 409 ? t.claimHas : t.claimGone); }
  };
  return (
    <>
      <section className="nhero short"><img src="/demo/w-bw2.jpg" alt="" /><div className="nhero-in"><h1>{info ? tx(lang, info.name) : t.claimTitle}</h1><span className="role">{t.claimTitle}</span></div></section>
      <div className="sheet narrow">
        {info === undefined || !loaded ? <div className="skeleton-line" /> : info === null ? <p className="muted" style={{ margin: 0 }}>{t.claimGone}</p> : (
          <div className="form">
            <p style={{ margin: 0 }}>{t.claimText}</p>
            {me ? <button type="button" className="btn lg" onClick={claim}>{t.claimBtn}</button>
              : <Link className="btn lg" href={`/${lang}/vhod?next=${encodeURIComponent(`/${lang}/preuzmi/${token}`)}`}>{t.login}</Link>}
            <Link href={`/${lang}/majstor/${info.slug}`} className="hint" style={{ textAlign: "center" }}>{t.viewProfile}</Link>
            {err && <span className="err">{err}</span>}
          </div>
        )}
      </div>
    </>
  );
}
