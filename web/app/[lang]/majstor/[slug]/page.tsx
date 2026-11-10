import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import { Ava } from "@/components/MasterCard";
import FavButton from "@/components/Fav";
import { api, fmtPrice, SITE } from "@/lib/api";
import { dict, isLang, tx, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

type P = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const m = await api.master(lang, slug);
  if (!m) return {};
  const t = dict(lang);
  const name = tx(lang, m.name);
  return {
    title: `${name} — ${tx(lang, m.services[0] || "")}`,
    description: `${tx(lang, m.about)} ${m.rating.toFixed(1)} ★, ${t.reviewsN(m.reviews)}.`,
    alternates: alternates(lang, `majstor/${slug}`),
    robots: m.demo ? { index: false, follow: true } : undefined,
    openGraph: { images: m.cover ? [`${SITE}${m.cover}`] : undefined },
  };
}

export default async function Page({ params }: P) {
  const { lang: l, slug } = await params;
  const lang = l as Lang;
  const t = dict(lang);
  const m = await api.master(lang, slug);
  if (!m) notFound();
  const name = tx(lang, m.name);
  const role = tx(lang, `${m.services[0] || ""}${m.district_list[0] ? " · " + m.district_list[0].name : ""}`);
  const ld = {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: m.name, url: `${SITE}/${lang}/majstor/${m.slug}`,
    image: m.cover ? `${SITE}${m.cover}` : undefined, areaServed: m.district_list.map((d) => d.name),
    aggregateRating: m.reviews ? { "@type": "AggregateRating", ratingValue: m.rating, reviewCount: m.reviews } : undefined,
    priceRange: m.price_from ? `${m.price_from} RSD+` : undefined,
  };
  const req = `/${lang}/zahtev?master=${m.slug}${m.service_list[0] ? `&service=${m.service_list[0].slug}` : ""}`;

  return (
    <>
      {!m.demo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />}
      <div className="profile">
        <div>
          <section className="p-hero">
            {m.cover && <img src={m.cover} alt="" />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link href={`/${lang}/usluge/${m.service_list[0]?.slug || ""}`} className="glass-btn" aria-label={t.back}><Icon name="left" size={18} stroke={2.2} /></Link>
              {m.demo && <span className="demo-tag" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>{t.demo}</span>}
              <FavButton slug={m.slug} label={t.favorite} className="glass-btn" />
            </div>
            <div className="p-title">
              <h1>{name}</h1>
              <span className="role">{role}</span>
            </div>
            <div className="p-stats">
              <div className="p-stat"><b>{m.rating.toFixed(1).replace(".", ",")}</b><span>{t.reviewsN(m.reviews)}</span></div>
              <div className="p-stat"><b>{m.orders}</b><span>{t.ordersLabel}</span></div>
              <div className="p-stat"><b>~{m.reply_min} {lang === "ru" ? "мин" : tx(lang, "min")}</b><span>{t.replyLabel}</span></div>
              <div className="p-stat"><b>{t.level[Math.min(m.level, 3)]}</b><span>{t.verifLabel}</span></div>
            </div>
          </section>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>{t.about}</h2>
            <p style={{ margin: 0 }}>{tx(lang, m.about)}</p>
            <div className="chips" style={{ marginTop: 14 }}>
              {m.experience_years > 0 && <span className="tag-chip">{t.experience(m.experience_years)}</span>}
              {m.warranty_months > 0 && <span className="tag-chip">{t.warranty(m.warranty_months)}</span>}
              <span className="tag-chip">{t.speaks}: {m.langs.map((x) => t.langNames[x] || x).join(", ")}</span>
            </div>
          </div>

          <div className="panel">
            <h2>{t.services}</h2>
            <div className="svc-list">
              {m.service_list.map((s) => (
                <Link key={s.slug} href={`/${lang}/zahtev?master=${m.slug}&service=${s.slug}`}>
                  <span>{tx(lang, s.name)}<small>{t.unit[s.unit] || ""}</small></span>
                  <b className="price">{t.from} {fmtPrice(s.price_from)} RSD</b>
                </Link>
              ))}
            </div>
          </div>

          {m.works.length > 0 && (
            <div className="panel">
              <h2>{t.portfolio}</h2>
              <div className="gallery">{m.works.map((w) => <img key={w} src={w} alt="" loading="lazy" />)}</div>
            </div>
          )}

          <div className="panel">
            <h2>{t.areas}</h2>
            <div className="chips">
              {m.district_list.map((d) => (
                <Link key={d.slug} href={`/${lang}/usluge/${m.service_list[0]?.slug}/${d.slug}`} className="chip"><Icon name="pin" size={16} stroke={2} />{tx(lang, d.name)}</Link>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>{t.reviews} · {m.rating.toFixed(1).replace(".", ",")} ★</h2>
            {m.review_list.length === 0 && <p className="muted" style={{ margin: 0 }}>—</p>}
            {m.review_list.map((r, i) => (
              <div key={i} className="review">
                <div className="top">
                  <b>{tx(lang, r.author)}</b>
                  <span className="stars" aria-label={`${r.rating}/5`}>{Array.from({ length: 5 }, (_, k) => <Icon key={k} name="star" size={13} fill={k < r.rating} stroke={1.6} />)}</span>
                  <span className="muted" style={{ fontSize: 13 }}>{tx(lang, r.service)}</span>
                  <time dateTime={r.date}>{r.date.split("-").reverse().join(".")}</time>
                </div>
                <p>{tx(lang, r.text)}</p>
                {r.tags.length > 0 && <div className="tags">{r.tags.map((g) => <span key={g}>{tx(lang, g)}</span>)}</div>}
              </div>
            ))}
          </div>
        </div>

        <aside className="order-card" aria-label={t.offer}>
          <div className="order-inner">
            <div className="row">
              <Ava m={m} size={48} />
              <div style={{ minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 15 }}>{name}</b>
                <span className="badge-row"><Icon name="star" size={13} fill /><b>{m.rating.toFixed(1).replace(".", ",")}</b>({m.reviews}) · {m.level >= 1 ? t.level[Math.min(m.level, 3)] : ""}</span>
              </div>
            </div>
            <span style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
              {m.online && <span className="online-dot" />}{t.reply(m.reply_min)}
            </span>
          </div>
          <div className="order-cols">
            <div><span>{t.services}</span><b>{t.from} {fmtPrice(m.price_from)}</b><span>RSD</span></div>
            <div><span>{t.areas}</span><b>{m.district_list.length}</b><span>{tx(lang, m.district_list.slice(0, 2).map((d) => d.name).join(", "))}</span></div>
          </div>
          <Link href={req} className="btn lg">{t.offer}</Link>
          <p className="fine">{lang === "ru" ? "Оплата мастеру напрямую после работы. Kront не берёт комиссию." : tx(lang, "Plaćanje majstoru direktno posle posla. Kront ne uzima proviziju.")}</p>
        </aside>
      </div>
    </>
  );
}
