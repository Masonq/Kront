import type { Metadata } from "next";
import Listing, { listingData, listingTitle, type SP } from "@/components/Listing";
import { api } from "@/lib/api";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

type P = { params: Promise<{ lang: string; slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const data = await listingData(lang, slug);
  if (!data) return {};
  const res = await api.masters(lang, { service: slug });
  const title = listingTitle(lang, data.cat);
  const t = dict(lang);
  return { title, description: `${title}: ${t.masters(res?.total || 0)}. ${t.heroText}`, alternates: alternates(lang, `usluge/${slug}`) };
}

export default async function Page({ params, searchParams }: P) {
  const { lang, slug } = await params;
  return <Listing lang={lang as Lang} slug={slug} sp={await searchParams} />;
}
