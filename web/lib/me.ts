"use client";
import { useEffect, useSyncExternalStore } from "react";

export type Me = { id: number; name: string; photo: string; email: string | null; tg: string; role: string; master: { slug: string; name: string } | null } | null;
type State = { me: Me; loaded: boolean; badges: { messages: number; requests: number } };
let state: State = { me: null, loaded: false, badges: { messages: 0, requests: 0 } };
const ls = new Set<() => void>();
const emit = (s: Partial<State>) => { state = { ...state, ...s }; ls.forEach((l) => l()); };
let started = false;

export async function refreshMe() {
  try {
    const r = await fetch("/api/v1/me", { cache: "no-store" });
    emit({ me: r.ok ? await r.json() : null, loaded: true });
  } catch { emit({ loaded: true }); }
}
export async function refreshBadges() {
  if (!state.me) return;
  try { const r = await fetch("/api/v1/me/badges", { cache: "no-store" }); if (r.ok) emit({ badges: await r.json() }); } catch { /* сеть */ }
}

export function useMe() {
  useEffect(() => {
    if (started) return;
    started = true;
    refreshMe().then(refreshBadges);
    const t = setInterval(refreshBadges, 15000);
    return () => clearInterval(t);
  }, []);
  return useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => state, () => state);
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(path, {
    method: opts.method || (opts.body ? "POST" : "GET"), cache: "no-store",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined, body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!r.ok) throw Object.assign(new Error(String(r.status)), { status: r.status });
  return (await r.json()) as T;
}

export async function uploadPhoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/v1/files", { method: "POST", body: fd });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()).url;
}

export function getMode(): "client" | "master" {
  if (typeof document === "undefined") return "client";
  return /(?:^|; )kront_mode=master/.test(document.cookie) ? "master" : "client";
}
export function setMode(m: "client" | "master") {
  document.cookie = `kront_mode=${m}; path=/; max-age=31536000; samesite=lax`;
}
