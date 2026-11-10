import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Icon from "./Icon";
import MasterCard from "./MasterCard";
import SortSelect from "./SortSelect";
import { api, SITE } from "@/lib/api";
import { dict, tx, type Lang } from "@/lib/i18n";

export type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const FILTERS = ["online", "verified", "ru", "urgent", "rating"] as const;

export async function listingData(lang: Lang, slug: string, district?: string) {
  const [cat, dists] = await Promise.all([api.category(lang, slug), api.districts(lang)]);
  if (!cat) return null;
  const d = district ? dists?.find((x) => x.slug === district) : undefined;
  if (district && !d) return null;
  return { cat, dists: dists || [], d };
}

export function listingTitle(lang: Lang, cat: { plural: string; name: string }, d?: { loc: string }) {
  const t = dict(lang);
  return tx(lang, `${cat.plural || cat.name} ${d ? d.loc : t.inCity}`);
}

export default async function Listing({ lang, slug, district, sp }: { lang: Lang; slug: string; district?: string; sp: SP }) {
  const t = dict(lang);
  const data = await listingData(lang, slug, district);
  if (!data) notFound();
  const { cat, dists, d } = data;
  const on = Object.fromEntries(FILTERS.map((f) => [f, one(sp[f]) === "1"])) as Record<(typeof FILTERS)[number], boolean>;
  const sort = one(sp.sort) || "recommended";
  const res = await api.masters(lang, {
    service: slug, district, online: on.online ? "true" : undefined, verified: on.verified ? "true" : undefined,
    speaks: on.ru ? "ru" : undefined, urgent: on.urgent ? "true" : undefined, rating: on.rating ? "4.5" : undefined, sort,
  });
  const base = `/${lang}/usluge/${slug}${district ? `/${district}` : ""}`;
  const toggle = (f: string) => {
    const p = new URLSearchParams();
    for (const k of FILTERS) if ((k === f) !== on[k]) p.set(k, "1");
    if (sort !== "recommended") p.set("sort", sort);
    return `${base}${p.size ? "?" + p : ""}`;
  };
  const title = listingTitle(lang, cat, d);
  const items = res?.items || [];
  const ld = {
    "@context": "https://schema.org", "@type": "ItemList", name: title,
    itemListElement: items.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/${lang}/majstor/${m.slug}`, name: m.name })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="list-head">
        <div>
          <nav className="crumbs" aria-label="breadcrumbs">
            <Link href={`/${lang}/usluge`}>{t.catalog}</Link><span>/</span>
            {cat.parent && (<><Link href={`/${lang}/usluge/${cat.parent.slug}`}>{tx(lang, cat.parent.name)}</Link><span>/</span></>)}
            <span>{tx(lang, cat.name)}</span>
          </nav>
          <h1 className="h1" style={{ marginTop: 8 }}>{title}</h1>
          <div className="meta">
            {t.masters(res?.total || 0)}
            {!!res?.online && (<><span className="sep" /><span className="online-dot" />{t.onlineNow(res.online)}</>)}
          </div>
        </div>
        <Link href={`/${lang}/zahtev?service=${slug}${district ? `&district=${district}` : ""}`} className="btn"><Icon name="plus" size={18} stroke={2.2} />{t.newRequest}</Link>
      </div>

      {cat.children.length > 0 && (
        <div className="chips scroll district-row">
          {cat.children.map((c) => (
            <Link key={c.slug} href={`/${lang}/usluge/${c.slug}${district ? `/${district}` : ""}`} className="chip">{tx(lang, c.name)}</Link>
          ))}
        </div>
      )}

      <div className="chips scroll district-row" aria-label="districts">
        <Link href={`/${lang}/usluge/${slug}`} className={`chip${!district ? " on" : ""}`}><Icon name="pin" size={16} stroke={2} />{t.districtAll}</Link>
        {dists.map((x) => (
          <Link key={x.slug} href={`/${lang}/usluge/${slug}/${x.slug}`} className={`chip${district === x.slug ? " on" : ""}`}>{tx(lang, x.name)}</Link>
        ))}
      </div>

      <div className="toolbar">
        <div className="chips scroll">
          {FILTERS.map((f) => (
            <Link key={f} href={toggle(f)} className={`chip${on[f] ? " on" : ""}`} scroll={false} rel="nofollow">
              {f === "online" && <span className="online-dot" />}{t.filters[f]}
            </Link>
          ))}
        </div>
        <Suspense><SortSelect labels={t.sort} value={sort} /></Suspense>
      </div>

      {items.length ? (
        <div className="grid-m">{items.map((m) => <MasterCard key={m.slug} lang={lang} m={m} />)}</div>
      ) : (
        <div className="empty" style={{ marginTop: 20 }}>
          <span>{t.empty}</span>
          <Link href={`/${lang}/zahtev?service=${slug}${district ? `&district=${district}` : ""}`} className="btn sm">{t.newRequest}</Link>
        </div>
      )}
    </>
  );
}
