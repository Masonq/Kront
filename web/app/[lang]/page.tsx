import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import MasterCard from "@/components/MasterCard";
import SearchBox from "@/components/SearchBox";
import SectionTile from "@/components/SectionTile";
import { api } from "@/lib/api";
import { dict, isLang, tx, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict(lang);
  return { title: { absolute: `Kront — ${t.heroTitle}` }, description: t.heroText, alternates: alternates(lang, "") };
}

const POPULAR = ["vodoinstalater", "elektricar", "klima-servis", "ciscenje-stana", "selidbe-kombi", "bravar"];

export default async function Home({ params }: P) {
  const { lang: l } = await params;
  const lang = l as Lang;
  const t = dict(lang);
  const [sections, top] = await Promise.all([api.catalog(lang), api.masters(lang, { limit: "8" })]);
  const subs = (sections || []).flatMap((s) => s.children);
  const popular = POPULAR.map((slug) => subs.find((c) => c.slug === slug)).filter(Boolean) as typeof subs;
  const masters = top?.items || [];
  const works = masters.filter((m) => m.cover).slice(0, 4);

  return (
    <>
      <section className="hero">
        <img src="/demo/hero.jpg" alt="" />
        <div className="hero-in">
          <h1>{t.heroTitle}</h1>
          <p>{t.heroText}</p>
          <SearchBox lang={lang} variant="hero" id="hero-q" />
          <div className="chips" aria-label={t.popular}>
            {popular.map((c) => <Link key={c.slug} href={`/${lang}/usluge/${c.slug}`} className="chip">{tx(lang, c.name)}</Link>)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{t.allCategories}</h2>
          <Link href={`/${lang}/usluge`}>{t.seeAll}</Link>
        </div>
        <div className="tiles">{(sections || []).slice(0, 8).map((s, i) => <SectionTile key={s.slug} lang={lang} s={s} big={i < 2} />)}</div>
      </section>

      {works.length > 0 && (
        <section className="section">
          <div className="section-head"><h2 className="h2">{t.nearby}</h2></div>
          <div className="works">
            {works.map((m) => (
              <Link key={m.slug} href={`/${lang}/majstor/${m.slug}`} className="work">
                <img src={m.cover} alt="" loading="lazy" />
                <span className="cap"><b>{tx(lang, m.name)}</b><span>{tx(lang, m.services[0] || "")}</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {masters.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="h2">{t.find}</h2>
            <Link href={`/${lang}/usluge`}>{t.seeAll}</Link>
          </div>
          <div className="grid-m" style={{ marginTop: 0 }}>{masters.slice(0, 6).map((m) => <MasterCard key={m.slug} lang={lang} m={m} />)}</div>
        </section>
      )}

      <section className="section">
        <div className="section-head"><h2 className="h2">{t.howTitle}</h2></div>
        <div className="steps">
          {[[t.how1, t.how1t], [t.how2, t.how2t], [t.how3, t.how3t]].map(([h, p], i) => (
            <div key={i} className="step"><span className="num">{i + 1}</span><b>{h}</b><p>{p}</p></div>
          ))}
        </div>
      </section>

      <section className="promo">
        <div>
          <h2 className="h2">{t.forMastersTitle}</h2>
          <p>{t.forMastersText}</p>
        </div>
        <Link href={`/${lang}/postani-majstor`} className="btn lg">{t.becomeMaster}</Link>
      </section>
    </>
  );
}
