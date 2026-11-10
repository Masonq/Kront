import type { Metadata } from "next";
import SectionTile from "@/components/SectionTile";
import { api } from "@/lib/api";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict(lang);
  return { title: `${t.allCategories} ${t.inCity}`, alternates: alternates(lang, "usluge") };
}

export default async function Page({ params }: P) {
  const lang = (await params).lang as Lang;
  const t = dict(lang);
  const sections = (await api.catalog(lang)) || [];
  return (
    <>
      <div className="list-head"><div><h1 className="h1">{t.allCategories} {t.inCity}</h1><div className="meta">{t.servicesN(sections.reduce((a, s) => a + s.children.length, 0))}</div></div></div>
      <div className="tiles">{sections.map((s, i) => <SectionTile key={s.slug} lang={lang} s={s} big={i < 2} />)}</div>
    </>
  );
}
