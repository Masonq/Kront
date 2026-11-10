"use client";
import Link from "next/link";
import HeroCardClient from "./HeroCardClient";
import { dict, tx, type Lang } from "@/lib/i18n";
import { sectionPhoto } from "@/lib/sections";
import { REQS, EMPTY_REQ, useStored, type SentReq } from "@/lib/local";
import { useEffect, useState } from "react";
import { api, useMe } from "@/lib/me";
import { apiLang } from "@/lib/i18n";

export default function OrdersList({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const local = useStored<SentReq[]>(REQS, EMPTY_REQ);
  const { me } = useMe();
  const [srv, setSrv] = useState<SentReq[] | null>(null);
  useEffect(() => {
    if (!me) return;
    api<{ id: number; created_at: string; service: string; service_slug: string; district: string; when: string; description: string; masters: { slug: string; name: string; photo: string }[] }[]>(`/api/v1/me/requests?lang=${apiLang(lang)}`)
      .then((rows) => setSrv(rows.map((r) => ({ id: r.id, at: r.created_at, service: r.service_slug, serviceName: r.service, section: "", district: r.district, when: r.when, description: r.description, masters: r.masters }))))
      .catch(() => setSrv(null));
  }, [me, lang]);
  const ids = new Set((srv || []).map((r) => r.id));
  const reqs = [...(srv || []), ...local.filter((r) => !ids.has(r.id))];
  if (!reqs.length) {
    return <HeroCardClient photo="/sec/dokumenti.jpg" title={t.ordersTitle} sub={t.ordersSub} text={t.ordEmpty} cta={t.newRequest} href={`/${lang}/zahtev`} />;
  }
  return (
    <>
      <div className="list-head"><div><h1 className="h1">{t.ordersTitle}</h1><div className="meta">{t.ordersSub}</div></div>
        <Link href={`/${lang}/zahtev`} className="btn">{t.newRequest}</Link></div>
      <div className="orders">
        {reqs.map((r) => (
          <article key={r.id + r.at} className="order-card">
            <div className="order-inner">
              <div className="row">
                <img src={sectionPhoto(r.section) || "/demo/hero.jpg"} alt="" className="thumb" />
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="status-pill">{t.statusSent} {new Date(r.at).toLocaleDateString(lang === "ru" ? "ru-RU" : "sr-RS", { day: "2-digit", month: "2-digit" })} · №{r.id}</span>
                  <b className="oc-title">{tx(lang, r.serviceName)}</b>
                  <span className="oc-sub">{r.description.slice(0, 70)}{r.description.length > 70 ? "…" : ""}</span>
                </div>
              </div>
            </div>
            <div className="order-cols">
              <div>
                <span>{t.reqMasters}</span>
                {r.masters.length ? (
                  <span className="avas">{r.masters.map((m) => (
                    <Link key={m.slug} href={`/${lang}/majstor/${m.slug}`} className="ava-x" title={tx(lang, m.name)}>
                      {m.photo ? <img src={m.photo} alt="" /> : m.name.split(/\s+/).map((x) => x[0]).join("").slice(0, 2)}
                    </Link>))}</span>
                ) : <small className="muted">{t.reqAny}</small>}
              </div>
              <div>
                <span>{t.reqWhere}</span>
                <b>{tx(lang, r.district)}</b>
                <small className="muted">{t.whenOpts[r.when]}</small>
              </div>
            </div>
            <Link href={`/${lang}/poruke`} className="btn lg">{t.messages}</Link>
          </article>
        ))}
      </div>
    </>
  );
}
