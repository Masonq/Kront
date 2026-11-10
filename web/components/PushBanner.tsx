"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, useMe } from "@/lib/me";

const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

export async function subscribePush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  const { key } = await api<{ key: string }>("/api/v1/push/key");
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
  await api("/api/v1/me/push", { body: sub.toJSON() });
  return true;
}

export default function PushBanner({ lang }: { lang: Lang }) {
  const t = d2(lang);
  const { me } = useMe();
  const [state, setState] = useState<"hidden" | "ask" | "ios" | "blocked" | "done">("hidden");
  useEffect(() => {
    if (!me) return;
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState(ios && !standalone ? "ios" : "hidden"); return; }
    if (Notification.permission === "granted") { subscribePush().catch(() => {}); setState("hidden"); return; }
    if (localStorage.getItem("kront_push_dismiss")) return;
    setState(Notification.permission === "denied" ? "hidden" : "ask");
  }, [me]);
  if (state === "hidden") return null;
  const close = () => { localStorage.setItem("kront_push_dismiss", "1"); setState("hidden"); };
  return (
    <div className="push-banner" role="region">
      <span className="pb-ic"><Icon name="msg" size={20} /></span>
      <span className="pb-txt"><b>{state === "done" ? t.pushDone : t.pushOn}</b><span>{state === "ios" ? t.pushIos : state === "blocked" ? t.pushBlocked : t.pushOnText}</span></span>
      {state === "ask" && <button type="button" className="btn sm" onClick={async () => { try { setState((await subscribePush()) ? "done" : "blocked"); } catch { setState("blocked"); } }}>{t.pushOn}</button>}
      <button type="button" className="round-btn" onClick={close} aria-label="×"><Icon name="close" size={14} stroke={2.4} /></button>
    </div>
  );
}
