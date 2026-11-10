"use client";
import { useSyncExternalStore } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  if (cache.has(key)) return cache.get(key) as T;
  let v = fallback;
  try { const raw = localStorage.getItem(key); if (raw) v = JSON.parse(raw) as T; } catch { /* пусто */ }
  cache.set(key, v);
  return v;
}

export function write<T>(key: string, v: T) {
  cache.set(key, v);
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* приватный режим */ }
  listeners.forEach((l) => l());
}

export function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); const s = (e: StorageEvent) => { if (e.key === key) { cache.delete(key); l(); } }; window.addEventListener("storage", s); return () => { listeners.delete(l); window.removeEventListener("storage", s); }; },
    () => read(key, fallback),
    () => fallback,
  );
}

export type Picked = { slug: string; name: string; photo: string };
export type SentReq = { id: number; at: string; service: string; serviceName: string; section: string; district: string; when: string; description: string; masters: Picked[] };

export const FAV = "kront_fav";
export const PICK = "kront_pick";
export const REQS = "kront_reqs";
export const EMPTY_STR: string[] = [];
export const EMPTY_PICK: Picked[] = [];
export const EMPTY_REQ: SentReq[] = [];
