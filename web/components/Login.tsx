"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, refreshMe, useMe } from "@/lib/me";

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function Login({ lang }: { lang: Lang }) {
  const t = d2(lang);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || `/${lang}`;
  const { me, loaded } = useMe();
  const [google, setGoogle] = useState<boolean | null>(null);
  useEffect(() => { api<{ google: boolean }>("/api/v1/auth/config").then((c) => setGoogle(c.google)).catch(() => setGoogle(false)); }, []);
  const logout = async () => { await api("/api/v1/auth/logout", { method: "POST" }).catch(() => {}); await refreshMe(); router.refresh(); };

  return (
    <>
      <section className="nhero short">
        <img src="/sec/brave-i-sigurnost.jpg" alt="" />
        <div className="nhero-in"><h1>{me ? me.name : t.loginTitle}</h1><span className="role">{me ? (me.email || "") : t.loginSub}</span></div>
      </section>
      <div className="sheet narrow">
        {!loaded || google === null ? <div className="skeleton-line" /> : me ? (
          <div className="form-actions"><span /><button type="button" className="btn ghost" onClick={logout}>{t.logout}</button></div>
        ) : (
          <div className="form">
            <p className="muted" style={{ margin: 0 }}>{t.loginNeed}</p>
            {google ? (
              <a href={`/api/v1/auth/google/start?next=${encodeURIComponent(next)}`} className="btn lg google"><GoogleG />{t.loginGoogle}</a>
            ) : <p className="hint">{t.loginNone}</p>}
            {sp.get("error") && <span className="err">{t.loginErr}</span>}
          </div>
        )}
      </div>
    </>
  );
}
