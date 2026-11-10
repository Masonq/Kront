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
  const [sections, districts, master] = await Promise.all([
    api.catalog(lang), api.districts(lang), sp.master ? api.master(lang, sp.master) : Promise.resolve(null),
  ]);
  const services = (sections || []).map((s) => ({ section: s.name, items: s.children.map((c) => ({ slug: c.slug, name: c.name })) }));
  let service = sp.service;
  // раздел верхнего уровня → первая подкатегория
  const sec = (sections || []).find((s) => s.slug === service);
  if (sec) service = sec.children[0]?.slug;
  if (!service && master?.service_list[0]) service = master.service_list[0].slug;
  return (
    <RequestForm lang={lang} services={services} districts={(districts || []).map((d) => ({ slug: d.slug, name: d.name }))}
      init={{ service, district: sp.district, master: master?.slug, q: sp.q }} masterName={master?.name} />
  );
}
