"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import MasterForm from "./MasterForm";
import NeedLogin from "./NeedLogin";
import PushBanner from "./PushBanner";
import { apiLang, dict, tx, type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, useMe, refreshBadges } from "@/lib/me";
import { sectionPhoto } from "@/lib/sections";

type Sec = { slug: string; name: string; children: { slug: string; name: string }[] };
type Dist = { slug: string; name: string };
type MyMaster = { slug: string; name: string; rating: number; reviews: number; orders: number; level: number; cover: string; photo: string;
  services: { slug: string; price_from: number }[]; districts: string[]; [k: string]: unknown };
type Req = { id: number; service: string; service_slug: string; district: string; description: string; when: string; budget: string; urgent: boolean;
  match: string; client: string; created_at: string };

export default function Cabinet({ lang, sections, districts, view }: { lang: Lang; sections: Sec[]; districts: Dist[]; view: "dash" | "edit" | "reviews" }) {
  const t = d2(lang);
  const t1 = dict(lang);
  const router = useRouter();
  const { me, loaded } = useMe();
  const [ms, setMs] = useState<MyMaster | null | undefined>(undefined);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [revs, setRevs] = useState<{ author: string; rating: number; text: string; service: string; tags: string[]; date: string }[]>([]);
  const load = useCallback(async () => {
    try {
      const m = await api<MyMaster | null>("/api/v1/me/master");
      setMs(m);
      if (m && view === "dash") setReqs(await api<Req[]>(`/api/v1/me/master/requests?lang=${apiLang(lang)}`));
      if (m && view === "reviews") setRevs(await api("/api/v1/me/master/reviews"));
    } catch { setMs(null); }
  }, [lang, view]);
  useEffect(() => { if (me) load(); }, [me, load]);

  if (!loaded) return <div className="nhero tall skeleton" />;
  if (!me) return <NeedLogin lang={lang} title={t.obTitle} photo="/demo/w-bw2.jpg" />;
  if (ms === undefined) return <div className="nhero tall skeleton" />;

  const secName = (slug: string) => sections.flatMap((s) => s.children).find((c) => c.slug === slug)?.name || slug;
  const hero = (title: string, sub: string) => (
    <section className="nhero short"><img src={ms?.cover || sectionPhoto(sections.find((s) => s.children.some((c) => c.slug === ms?.services[0]?.slug))?.slug) || "/demo/w-bw2.jpg"} alt="" />
      <div className="nhero-in"><h1>{title}</h1><span className="role">{sub}</span></div></section>
  );

  if (!ms || view === "edit") {
    return (<>
      {hero(ms ? ms.name : t.becomeCta, t.obTitle)}
      <div className="sheet"><MasterForm lang={lang} sections={sections} districts={districts} defaultName={me.name}
        initial={ms ? { name: ms.name, kind: String(ms.kind), services: ms.services, districts: ms.districts, about: String(ms.about || ""), langs: ms.langs as string[],
          phone: String(ms.phone || ""), experience_years: Number(ms.experience_years), warranty_months: Number(ms.warranty_months), photo: ms.photo, cover: ms.cover, works: ms.works as string[] } : null} /></div>
    </>);
  }

  if (view === "reviews") {
    return (<>
      {hero(t.myReviews, `${ms.rating.toFixed(1).replace(".", ",")} ★ · ${ms.reviews} ${t.statsReviews}`)}
      <div className="sheet">
        {revs.length === 0 ? <p className="muted" style={{ margin: 0 }}>—</p> : revs.map((r, i) => (
          <div key={i} className="review">
            <div className="top"><b>{r.author}</b><span className="stars">{Array.from({ length: 5 }, (_, k) => <Icon key={k} name="star" size={13} fill={k < r.rating} stroke={1.6} />)}</span>
              <span className="muted" style={{ fontSize: 13 }}>{r.service}</span><time>{r.date.split("-").reverse().join(".")}</time></div>
            {r.text && <p>{r.text}</p>}
            {r.tags.length > 0 && <div className="tags">{r.tags.map((g) => <span key={g}>{g}</span>)}</div>}
          </div>
        ))}
      </div>
    </>);
  }

  const act = async (id: number, a: "take" | "decline") => {
    try {
      const r = await api<{ conversation: number | null }>(`/api/v1/me/master/requests/${id}/${a}`, { method: "POST" });
      refreshBadges();
      if (a === "take" && r.conversation) router.push(`/${lang}/poruke/${r.conversation}`); else load();
    } catch (e) { if ((e as { status?: number }).status === 409) alert(t.alreadyTaken); load(); }
  };
  const fresh = reqs.filter((r) => r.match === "pending");
  const old = reqs.filter((r) => r.match !== "pending");

  return (<>
    {hero(ms.name, t.dashboard)}
    <div className="sheet">
      <PushBanner lang={lang} />
      <div className="kpis">
        <div><b>{ms.rating ? ms.rating.toFixed(1).replace(".", ",") : "—"}</b><span>{t.statsRating}</span></div>
        <div><b>{ms.reviews}</b><span>{t.statsReviews}</span></div>
        <div><b>{ms.orders}</b><span>{t.statsOrders}</span></div>
        <div><b className="sm">{t1.level[Math.min(ms.level, 3)]}</b><span>{t1.verifLabel}</span></div>
      </div>
      <div className="chips" style={{ marginTop: 16 }}>
        <Link href={`/${lang}/kabinet/profil`} className="btn sm ghost"><Icon name="user" size={16} />{t.myProfile}</Link>
        <Link href={`/${lang}/kabinet/provera`} className="btn sm ghost"><Icon name="shield" size={16} />{t.verif}</Link>
        <Link href={`/${lang}/majstor/${ms.slug}`} className="btn sm ghost">{t.viewProfile}</Link>
      </div>
      <h2 className="h2" style={{ margin: "28px 0 14px" }}>{t.newReqs}{fresh.length > 0 && <span className="count-red" style={{ marginLeft: 10, verticalAlign: "middle" }}>{fresh.length}</span>}</h2>
      {fresh.length === 0 && <p className="muted" style={{ margin: 0 }}>{t.noReqs}</p>}
      <div className="orders">
        {[...fresh, ...old].map((r) => (
          <article key={r.id} className="order-card">
            <div className="order-inner">
              <div className="row">
                <img src={sectionPhoto(sections.find((s) => s.children.some((c) => c.slug === r.service_slug))?.slug) || "/demo/hero.jpg"} alt="" className="thumb" />
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="status-pill">{r.urgent ? "⚡ " : ""}{r.match === "pending" ? t.pending : r.match === "taken" ? t.taken : r.match === "closed" ? t.alreadyTaken.split(".")[0] : t.declined} · №{r.id}</span>
                  <b className="oc-title">{tx(lang, r.service || secName(r.service_slug))}</b>
                  <span className="oc-sub">{r.description}</span>
                </div>
              </div>
            </div>
            <div className="order-cols">
              <div><span>{t1.reqWhere}</span><b>{tx(lang, r.district)}</b><small className="muted">{t1.whenOpts[r.when] || r.when}</small></div>
              <div><span>{t1.reqBudget}</span><b>{r.budget || "—"}</b><small className="muted">{r.client}</small></div>
            </div>
            {r.match === "pending" && (
              <div className="two-btn">
                <button type="button" className="btn ghost" onClick={() => act(r.id, "decline")}>{t.decline}</button>
                <button type="button" className="btn lg" onClick={() => act(r.id, "take")}>{t.take}</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  </>);
}
