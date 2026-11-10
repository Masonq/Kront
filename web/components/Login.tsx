"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "./Icon";
import { type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, refreshMe, refreshBadges, useMe } from "@/lib/me";

type Cfg = { telegram: boolean; email: boolean; bot: string };

export default function Login({ lang }: { lang: Lang }) {
  const t = d2(lang);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || `/${lang}`;
  const { me, loaded } = useMe();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [tg, setTg] = useState<{ token: string; url: string } | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { api<Cfg>("/api/v1/auth/config").then(setCfg).catch(() => setCfg({ telegram: false, email: false, bot: "" })); }, []);
  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  const done = async () => { await refreshMe(); await refreshBadges(); router.replace(next); router.refresh(); };

  const startTg = async () => {
    setErr("");
    try {
      const r = await api<{ token: string; url: string }>("/api/v1/auth/tg/start", { method: "POST" });
      setTg(r);
      window.open(r.url, "_blank", "noopener");
      if (poll.current) clearInterval(poll.current);
      poll.current = setInterval(async () => {
        try {
          const c = await api<{ ok: boolean }>(`/api/v1/auth/tg/check?token=${r.token}`, { method: "POST" });
          if (c.ok) { clearInterval(poll.current!); done(); }
        } catch { clearInterval(poll.current!); setTg(null); setErr(t.err); }
      }, 2000);
    } catch { setErr(t.err); }
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await api("/api/v1/auth/email/start", { body: { email } }); setStage("code"); } catch { setErr(t.err); }
    setBusy(false);
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await api("/api/v1/auth/email/verify", { body: { email, code } }); await done(); } catch { setErr(t.wrongCode); }
    setBusy(false);
  };
  const logout = async () => { await api("/api/v1/auth/logout", { method: "POST" }).catch(() => {}); await refreshMe(); router.refresh(); };

  return (
    <>
      <section className="nhero short">
        <img src="/sec/brave-i-sigurnost.jpg" alt="" />
        <div className="nhero-in"><h1>{me ? me.name : t.loginTitle}</h1><span className="role">{t.loginSub}</span></div>
      </section>
      <div className="sheet narrow">
        {!loaded || !cfg ? <div className="skeleton-line" /> : me ? (
          <div className="form">
            <p className="muted" style={{ margin: 0 }}>{me.email || (me.tg ? "@" + me.tg : "")}</p>
            <div className="form-actions"><span /><button type="button" className="btn ghost" onClick={logout}>{t.logout}</button></div>
          </div>
        ) : (
          <div className="form">
            <p className="muted" style={{ margin: 0 }}>{t.loginNeed}</p>
            {cfg.telegram && (
              <>
                <button type="button" className="btn lg tg" onClick={startTg}><Icon name="send" size={20} />{t.loginTg}</button>
                {tg && <p className="hint">{t.loginTgWait} · <a href={tg.url} target="_blank" rel="noopener">{t.loginTgOpen}</a></p>}
              </>
            )}
            {cfg.email && (stage === "email" ? (
              <form className="form" onSubmit={sendCode}>
                <label>{t.loginEmail}<input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} autoComplete="email" /></label>
                <button type="submit" className="btn" disabled={busy}>{t.sendCode}</button>
              </form>
            ) : (
              <form className="form" onSubmit={verify}>
                <label>{t.codePh}<input className="input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" /></label>
                <button type="submit" className="btn" disabled={busy || code.length !== 6}>{t.enter}</button>
              </form>
            ))}
            {!cfg.telegram && !cfg.email && <p className="hint">{t.loginNone}</p>}
            {err && <span className="err">{err}</span>}
          </div>
        )}
      </div>
    </>
  );
}
