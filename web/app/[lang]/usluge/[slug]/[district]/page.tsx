import type { Metadata } from "next";
import Listing, { listingData, listingTitle, type SP } from "@/components/Listing";
import { api } from "@/lib/api";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

type P = { params: Promise<{ lang: string; slug: string; district: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, slug, district } = await params;
  if (!isLang(lang)) return {};
  const data = await listingData(lang, slug, district);
  if (!data) return {};
  const res = await api.masters(lang, { service: slug, district });
  const title = listingTitle(lang, data.cat, data.d);
  const t = dict(lang);
  return {
    title, description: `${title}: ${t.masters(res?.total || 0)}. ${t.heroText}`,
    alternates: alternates(lang, `usluge/${slug}/${district}`),
    robots: res && res.total > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function Page({ params, searchParams }: P) {
  const { lang, slug, district } = await params;
  return <Listing lang={lang as Lang} slug={slug} district={district} sp={await searchParams} />;
}
