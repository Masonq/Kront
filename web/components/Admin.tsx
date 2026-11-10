"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import NeedLogin from "./NeedLogin";
import { type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, useMe } from "@/lib/me";

type O = {
  stats: Record<string, number>;
  requests: { id: number; description: string; contact: string; status: string; at: string; masters: string }[];
  leads: { id: number; name: string; contact: string; service: string; district: string; at: string }[];
  masters: { id: number; slug: string; name: string; demo: boolean; hidden: boolean; level: number; rating: number; reviews: number; user: boolean }[];
  reviews: { id: number; master_id: number; author: string; rating: number; text: string }[];
  users: { id: number; name: string; tg: string; email: string | null; role: string; at: string }[];
};
const dt = (s: string) => new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function Admin({ lang }: { lang: Lang }) {
  const t = d2(lang);
  const { me, loaded } = useMe();
  const [o, setO] = useState<O | null>(null);
  const [tab, setTab] = useState<"requests" | "masters" | "leads" | "reviews" | "users">("requests");
  const load = useCallback(() => api<O>("/api/v1/admin/overview").then(setO).catch(() => setO(null)), []);
  useEffect(() => { if (me?.role === "admin") load(); }, [me, load]);
  if (!loaded) return <div className="nhero tall skeleton" />;
  if (!me) return <NeedLogin lang={lang} title={t.adminTitle} />;
  if (me.role !== "admin") return <div className="empty">403</div>;
  if (!o) return <div className="skeleton-line" />;
  const patch = async (id: number, body: object) => { await api(`/api/v1/admin/masters/${id}`, { method: "PATCH", body }); load(); };
  const del = async (path: string) => { await api(path, { method: "DELETE" }); load(); };
  const tabs: [typeof tab, string, number][] = [["requests", t.aRequests, o.stats.requests], ["masters", t.aMasters, o.stats.masters + o.stats.demo], ["leads", t.aLeads, o.stats.leads], ["reviews", t.aReviews, o.stats.reviews], ["users", t.aUsers, o.stats.users]];
  return (
    <>
      <div className="list-head"><div><h1 className="h1">{t.adminTitle}</h1>
        <div className="meta">{t.aOrders}: {o.stats.orders} · {t.aConfirmed} {o.stats.confirmed} · {t.aDemo}: {o.stats.demo}</div></div>
        {o.stats.demo > 0 && <button type="button" className="btn ghost" onClick={async () => { if (confirm(t.aConfirmDemo)) { await api("/api/v1/admin/demo/delete", { method: "POST" }); load(); } }}>{t.aDelDemo}</button>}
      </div>
      <div className="kpis" style={{ marginTop: 20 }}>{tabs.map(([k, label, n]) => <div key={k}><b>{n}</b><span>{label}</span></div>)}</div>
      <div className="chips" style={{ marginTop: 20 }}>{tabs.map(([k, label]) => <button key={k} type="button" className={`chip${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{label}</button>)}</div>
      <div className="table-wrap">
        <table className="tbl">
          {tab === "requests" && (<><thead><tr><th>№</th><th>Дата</th><th>Описание</th><th>Контакт</th><th>Мастера</th></tr></thead>
            <tbody>{o.requests.map((r) => <tr key={r.id}><td>{r.id}</td><td>{dt(r.at)}</td><td>{r.description}</td><td>{r.contact}</td><td>{r.masters || "—"}</td></tr>)}</tbody></>)}
          {tab === "masters" && (<><thead><tr><th>Мастер</th><th>★</th><th>{t.aLevel}</th><th /></tr></thead>
            <tbody>{o.masters.map((x) => <tr key={x.id} className={x.hidden ? "dim" : ""}>
              <td><Link href={`/${lang}/majstor/${x.slug}`}>{x.name}</Link>{x.demo && <span className="demo-tag" style={{ marginLeft: 8 }}>demo</span>}{x.user && <span className="demo-tag" style={{ marginLeft: 8 }}>user</span>}</td>
              <td>{x.rating.toFixed(1)} ({x.reviews})</td>
              <td><select className="select" value={x.level} onChange={(e) => patch(x.id, { level: Number(e.target.value) })}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select></td>
              <td><button type="button" className="btn sm ghost" onClick={() => patch(x.id, { hidden: !x.hidden })}>{x.hidden ? t.aShow : t.aHide}</button></td></tr>)}</tbody></>)}
          {tab === "leads" && (<><thead><tr><th>Дата</th><th>Имя</th><th>Контакт</th><th>Услуги</th><th /></tr></thead>
            <tbody>{o.leads.map((x) => <tr key={x.id}><td>{dt(x.at)}</td><td>{x.name}</td><td>{x.contact}</td><td>{x.service} {x.district}</td>
              <td><button type="button" className="btn sm ghost" onClick={() => del(`/api/v1/admin/leads/${x.id}`)}>{t.aDelete}</button></td></tr>)}</tbody></>)}
          {tab === "reviews" && (<><thead><tr><th>Автор</th><th>★</th><th>Текст</th><th /></tr></thead>
            <tbody>{o.reviews.map((x) => <tr key={x.id}><td>{x.author}</td><td>{x.rating}</td><td>{x.text}</td>
              <td><button type="button" className="btn sm ghost" onClick={() => del(`/api/v1/admin/reviews/${x.id}`)}>{t.aDelete}</button></td></tr>)}</tbody></>)}
          {tab === "users" && (<><thead><tr><th>№</th><th>Имя</th><th>Telegram / email</th><th>Роль</th><th>Дата</th></tr></thead>
            <tbody>{o.users.map((x) => <tr key={x.id}><td>{x.id}</td><td>{x.name}</td><td>{x.tg ? "@" + x.tg : x.email}</td><td>{x.role}</td><td>{dt(x.at)}</td></tr>)}</tbody></>)}
        </table>
      </div>
    </>
  );
}
