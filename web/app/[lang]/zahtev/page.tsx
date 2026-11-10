import type { Metadata } from "next";
import RequestForm from "@/components/RequestForm";
import { api } from "@/lib/api";
import { dict, isLang, type Lang } from "@/lib/i18n";

type P = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: dict(lang).reqTitle, robots: { index: false } };
}

export default async function Page({ params, searchParams }: P) {
  const { lang: l } = await params;
  const lang = l as Lang;
  const sp = await searchParams;
  const slugs = (sp.masters || sp.master || "").split(",").filter(Boolean).slice(0, 3);
  const [sections, districts, picked] = await Promise.all([
    api.catalog(lang), api.districts(lang), slugs.length ? api.masters(lang, { slugs: slugs.join(",") }) : Promise.resolve(null),
  ]);
  const services = (sections || []).map((s) => ({ section: s.name, sectionSlug: s.slug, items: s.children.map((c) => ({ slug: c.slug, name: c.name })) }));
  let service = sp.service;
  const sec = (sections || []).find((s) => s.slug === service);
  if (sec) service = sec.children[0]?.slug;
  const masters = (picked?.items || []).map((m) => ({ slug: m.slug, name: m.name, photo: m.photo }));
  if (!service && slugs.length === 1) {
    const full = await api.master(lang, slugs[0]);
    service = full?.service_list[0]?.slug;
  }
  return <RequestForm lang={lang} services={services} districts={(districts || []).map((d) => ({ slug: d.slug, name: d.name }))}
    init={{ service, district: sp.district, q: sp.q }} masters={masters} />;
}
