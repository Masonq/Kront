import type { Lang } from "./i18n";
import { apiLang } from "./i18n";

const BASE = process.env.API_INTERNAL || "http://127.0.0.1:8000";

export type Cat = { id: number; slug: string; name: string; plural: string; icon: string; unit: string; urgent: boolean; parent_id: number | null; count?: number };
export type Section = Cat & { count: number; children: (Cat & { count: number })[] };
export type District = { slug: string; name: string; loc: string };
export type MasterCard = {
  slug: string; name: string; kind: string; photo: string; cover: string; level: number; rating: number; reviews: number;
  orders: number; reply_min: number; langs: string[]; online: boolean; urgent: boolean; demo: boolean; services: string[];
  price_from: number; districts: string[]; works: string[]; claimed: boolean; tg: string;
};
export type MasterFull = MasterCard & {
  about: string; experience_years: number; warranty_months: number; claimed: boolean; source_url: string;
  service_list: { slug: string; name: string; price_from: number; unit: string }[];
  district_list: District[];
  review_list: { author: string; rating: number; text: string; service: string; tags: string[]; date: string; lang: string }[];
};

async function get<T>(path: string, lang: Lang, params: Record<string, string | undefined> = {}): Promise<T | null> {
  const qs = new URLSearchParams({ lang: apiLang(lang) });
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  try {
    const r = await fetch(`${BASE}${path}?${qs}`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  catalog: (l: Lang) => get<Section[]>("/api/v1/catalog", l),
  districts: (l: Lang) => get<District[]>("/api/v1/districts", l),
  category: (l: Lang, slug: string) => get<Cat & { parent: Cat | null; children: Cat[] }>(`/api/v1/category/${slug}`, l),
  masters: (l: Lang, p: Record<string, string | undefined>) => get<{ total: number; online: number; items: MasterCard[] }>("/api/v1/masters", l, p),
  master: (l: Lang, slug: string) => get<MasterFull>(`/api/v1/masters/${slug}`, l),
  sitemap: () => get<{ categories: string[]; districts: string[]; masters: string[]; pairs: [string, string][] }>("/api/v1/sitemap", "sr"),
};

export const SITE = process.env.SITE_URL || "http://89.208.113.147:8095";

export function fmtPrice(n: number) {
  return n.toLocaleString("ru-RU").replace(/\u00a0/g, " ");
}
