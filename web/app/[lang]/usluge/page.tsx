import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import { dict, isLang, tx, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict(lang);
  return { title: `${t.allCategories} ${t.inCity}`, alternates: alternates(lang, "usluge") };
}

export default async function Page({ params }: P) {
  const { lang: l } = await params;
  const lang = l as Lang;
  const t = dict(lang);
  const sections = (await api.catalog(lang)) || [];
  return (
    <>
      <h1 className="h1">{t.allCategories} {t.inCity}</h1>
      <div className="section" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 28 }}>
        {sections.map((s) => (
          <section key={s.slug}>
            <div className="section-head">
              <Link href={`/${lang}/usluge/${s.slug}`} className="h2" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="cat-card" style={{ minHeight: 0, padding: 0, border: 0, background: "none" }}><span className="ic"><Icon name={s.icon} /></span></span>
                {tx(lang, s.name)}
              </Link>
              <Link href={`/${lang}/usluge/${s.slug}`}>{t.masters(s.count)}</Link>
            </div>
            <div className="chips">
              {s.children.map((c) => (
                <Link key={c.slug} href={`/${lang}/usluge/${c.slug}`} className="chip">{tx(lang, c.name)}{c.count > 0 && <span className="muted" style={{ fontSize: 12 }}>{c.count}</span>}</Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
