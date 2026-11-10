"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import NeedLogin from "./NeedLogin";
import PushBanner from "./PushBanner";
import { apiLang, dict, tx, type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, uploadPhoto, useMe, refreshBadges } from "@/lib/me";
import { fmtPrice } from "@/lib/api";

type ConvItem = { id: number; side: string; other: { name: string; photo: string; slug: string | null }; unread: number; last: { kind: string; body: string; at: string } | null };
type Ord = { id: number; title: string; details: string; price: number; visit: string; final_price: number; status: string; reviewed: boolean };
type Msg = { id: number; kind: string; body: string; mine: boolean; at: string; order: Ord | null };
type Conv = { id: number; side: "client" | "master" | "admin"; master: { slug: string; name: string; photo: string; phone: string }; client: { name: string; photo: string };
  other_read_at: string; messages: Msg[]; orders: Ord[] };

const ini = (n: string) => (n || "?").split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

function Ava({ name, photo, size = 44 }: { name: string; photo: string; size?: number }) {
  return <span className="cava" style={{ width: size, height: size }}>{photo ? <img src={photo} alt="" /> : ini(name)}</span>;
}

export default function Chats({ lang, activeId }: { lang: Lang; activeId?: number }) {
  const t = d2(lang);
  const { me, loaded } = useMe();
  const [list, setList] = useState<ConvItem[] | null>(null);
  const loadList = useCallback(() => api<ConvItem[]>("/api/v1/me/conversations").then(setList).catch(() => setList([])), []);
  useEffect(() => { if (!me) return; loadList(); const h = setInterval(loadList, 6000); return () => clearInterval(h); }, [me, loadList]);

  if (!loaded) return <div className="nhero tall skeleton" />;
  if (!me) return <NeedLogin lang={lang} title={t.chats} photo="/sec/casovi.jpg" />;

  return (
    <div className={`chats${activeId ? " has-active" : ""}`}>
      <aside className="chat-list" aria-label={t.chats}>
        <h1 className="h2" style={{ padding: "4px 8px 12px" }}>{t.chats}</h1>
        <div style={{ padding: "0 4px 8px" }}><PushBanner lang={lang} /></div>
        {list === null ? <div className="skeleton-line" /> : list.length === 0 ? <p className="muted" style={{ padding: "0 8px", margin: 0 }}>{t.noChats}</p> :
          list.map((c) => (
            <Link key={c.id} href={`/${lang}/poruke/${c.id}`} className="chat-item" aria-current={c.id === activeId ? "page" : undefined}>
              <Ava name={c.other.name} photo={c.other.photo} />
              <span className="ci-mid">
                <b>{tx(lang, c.other.name)}</b>
                <span>{c.last ? (c.last.kind === "photo" ? t.photoMsg : c.last.kind === "order" ? t.offer : c.last.kind === "system" ? (t.sys[c.last.body.split("|")[0]] || "") : c.last.body) : ""}</span>
              </span>
              <span className="ci-end">{c.last && <time>{hhmm(c.last.at)}</time>}{c.unread > 0 && <span className="count-red">{c.unread}</span>}</span>
            </Link>
          ))}
      </aside>
      {activeId ? <Chat lang={lang} id={activeId} onChange={loadList} /> : <div className="chat-empty"><Icon name="msg" size={28} /><span>{t.noChats}</span></div>}
    </div>
  );
}

function Chat({ lang, id, onChange }: { lang: Lang; id: number; onChange: () => void }) {
  const t = d2(lang);
  const t1 = dict(lang);
  const router = useRouter();
  const [c, setC] = useState<Conv | null>(null);
  const [err, setErr] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [of, setOf] = useState({ title: "", price: "", visit: "", details: "" });
  const end = useRef<HTMLDivElement>(null);
  const [tr, setTr] = useState<Record<string, string>>({});
  const [orig, setOrig] = useState<Record<number, boolean>>({});
  const asked = useRef<Set<number>>(new Set());
  const [aiOn, setAiOn] = useState(false);
  useEffect(() => { api<{ translate: boolean }>("/api/v1/ai/status").then((r) => setAiOn(r.translate)).catch(() => {}); }, []);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try { const r = await api<Conv>(`/api/v1/conversations/${id}`); setC(r); setErr(false); } catch { setErr(true); }
  }, [id]);
  useEffect(() => { load(); const h = setInterval(load, 3000); return () => clearInterval(h); }, [load]);
  useEffect(() => {
    if (!aiOn || !c) return;
    const ids = c.messages.filter((m) => !m.mine && m.kind === "text" && !asked.current.has(m.id)).map((m) => m.id);
    if (!ids.length) return;
    ids.forEach((i) => asked.current.add(i));
    api<Record<string, string>>(`/api/v1/conversations/${id}/translate`, { body: { ids, lang: apiLang(lang) } }).then((r) => setTr((x) => ({ ...x, ...r }))).catch(() => {});
  }, [c, aiOn, id, lang]);
  useEffect(() => {
    if (c && c.messages.length !== lastCount.current) {
      lastCount.current = c.messages.length;
      end.current?.scrollIntoView({ block: "end" });
      refreshBadges(); onChange();
    }
  }, [c, onChange]);

  if (err && !c) return <div className="chat-empty"><span>{t.err}</span></div>;
  if (!c) return <div className="chat-pane"><div className="skeleton-line" /></div>;

  const other = c.side === "client" ? { name: c.master.name, photo: c.master.photo } : c.client;
  const send = async (body: string, kind = "text") => {
    if (!body.trim()) return;
    setBusy(true);
    try { await api(`/api/v1/conversations/${id}/messages`, { body: { body, kind } }); setText(""); await load(); } catch { /* сеть */ }
    setBusy(false);
  };
  const photo = async (files: FileList | null) => { if (!files?.[0]) return; setBusy(true); try { const url = await uploadPhoto(files[0]); await send(url, "photo"); } catch { /* */ } setBusy(false); };
  const sendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api(`/api/v1/conversations/${id}/offer`, { body: { title: of.title, price: Number(of.price) || 0, visit: of.visit.replace("T", " "), details: of.details } }); setOfferOpen(false); setOf({ title: "", price: "", visit: "", details: "" }); load(); } catch { /* */ }
  };
  const orderAct = async (oid: number, a: string, final_price = 0) => { try { await api(`/api/v1/orders/${oid}/act/${a}`, { body: { final_price } }); load(); } catch { load(); } };
  const lastMine = [...c.messages].reverse().find((m) => m.mine);
  const readMine = lastMine && new Date(c.other_read_at) >= new Date(lastMine.at);

  return (
    <section className="chat-pane" aria-label={other.name}>
      <header className="chat-head">
        <Link href={`/${lang}/poruke`} className="round-btn chat-back" aria-label="←"><Icon name="left" size={16} stroke={2} /></Link>
        <Ava name={other.name} photo={other.photo} size={40} />
        <span className="ch-name">{c.side === "client" ? <Link href={`/${lang}/majstor/${c.master.slug}`}><b>{tx(lang, other.name)}</b></Link> : <b>{other.name}</b>}</span>
        {c.side === "client" && c.master.phone && <a href={`tel:${c.master.phone}`} className="btn sm ghost"><Icon name="phone" size={16} />{t.callMaster}</a>}
      </header>

      <div className="msgs">
        {c.messages.map((m) => {
          if (m.kind === "system") {
            const [k, v] = m.body.split("|");
            return <div key={m.id} className="sys">{t.sys[k] || k}{v ? ` · ${tx(lang, v)}` : ""}</div>;
          }
          if (m.kind === "order" && m.order) {
            const o = m.order;
            return (
              <div key={m.id} className="order-msg">
                <div className="order-inner">
                  <span className="status-pill">{t.st[o.status]}</span>
                  <b className="oc-title">{o.title}</b>
                  {o.details && <span className="oc-sub" style={{ WebkitLineClamp: 4 }}>{o.details}</span>}
                </div>
                <div className="order-cols">
                  <div><span>{t.offerPrice}</span><b>{fmtPrice(o.final_price || o.price)} RSD</b></div>
                  <div><span>{t.offerVisit}</span><b>{o.visit ? o.visit.slice(8, 10) + "." + o.visit.slice(5, 7) + " " + o.visit.slice(11, 16) : "—"}</b></div>
                </div>
                {c.side === "client" && o.status === "offer" && <div className="two-btn"><button type="button" className="btn ghost" onClick={() => orderAct(o.id, "decline")}>{t.declineOffer}</button><button type="button" className="btn" onClick={() => orderAct(o.id, "accept")}>{t.accept}</button></div>}
                {c.side === "master" && o.status === "agreed" && <div className="two-btn"><button type="button" className="btn ghost" onClick={() => orderAct(o.id, "cancel")}>{t.cancel}</button><button type="button" className="btn" onClick={() => { const v = prompt(t.finalPrice, String(o.price)); if (v !== null) orderAct(o.id, "done", Number(v.replace(/\D/g, "")) || o.price); }}>{t.markDone}</button></div>}
                {c.side === "client" && o.status === "done" && <button type="button" className="btn lg" onClick={() => orderAct(o.id, "confirm")}>{t.confirm}</button>}
                {c.side === "client" && o.status === "confirmed" && !o.reviewed && <ReviewForm lang={lang} orderId={o.id} onDone={load} />}
              </div>
            );
          }
          return (
            <div key={m.id} className={`bubble${m.mine ? " mine" : ""}${m.kind === "photo" ? " photo" : ""}`}>
              {m.kind === "photo" ? <a href={m.body} target="_blank" rel="noopener"><img src={m.body} alt={t.photoMsg} /></a>
                : tr[m.id] && !orig[m.id] ? <span>{tr[m.id]}</span> : <span>{m.body}</span>}
              {tr[m.id] && <button type="button" className="tr-toggle" onClick={() => setOrig({ ...orig, [m.id]: !orig[m.id] })}>{orig[m.id] ? t.translated : `${t.autoTr} · ${t.original}`}</button>}
              <time>{hhmm(m.at)}</time>
            </div>
          );
        })}
        {readMine && <div className="read-mark">{t.readMark}</div>}
        <div ref={end} />
      </div>

      {offerOpen && c.side === "master" && (
        <form className="offer-form" onSubmit={sendOffer}>
          <div className="two"><label>{t.offerTitle}<input className="input" required value={of.title} onChange={(e) => setOf({ ...of, title: e.target.value })} /></label>
            <label>{t.offerPrice}<input className="input" required inputMode="numeric" value={of.price} onChange={(e) => setOf({ ...of, price: e.target.value.replace(/\D/g, "") })} /></label></div>
          <div className="two"><label>{t.offerVisit}<input className="input" type="datetime-local" value={of.visit} onChange={(e) => setOf({ ...of, visit: e.target.value })} /></label>
            <label>{t.offerDetails}<input className="input" value={of.details} onChange={(e) => setOf({ ...of, details: e.target.value })} /></label></div>
          <div className="form-actions"><button type="button" className="btn ghost" onClick={() => setOfferOpen(false)}>{t.cancel}</button><button type="submit" className="btn">{t.offerNew}</button></div>
        </form>
      )}

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <label className="round-btn big" aria-label={t.photoMsg}><Icon name="camera" size={18} /><input type="file" accept="image/*" hidden onChange={(e) => photo(e.target.files)} /></label>
        {c.side === "master" && <button type="button" className="round-btn big" aria-label={t.offerNew} title={t.offerNew} onClick={() => setOfferOpen(!offerOpen)}><Icon name="doc" size={18} /></button>}
        <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.typeMsg} aria-label={t.typeMsg}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        <button type="submit" className="send-btn" disabled={busy || !text.trim()} aria-label={t.sendMsg}><Icon name="send" size={18} /></button>
      </form>
    </section>
  );
}

function ReviewForm({ lang, orderId, onDone }: { lang: Lang; orderId: number; onDone: () => void }) {
  const t = d2(lang);
  const [r, setR] = useState({ rating: 5, quality: 5, punctuality: 5, price_fair: 5, tags: [] as string[], text: "" });
  const Stars = ({ k, label }: { k: "rating" | "quality" | "punctuality" | "price_fair"; label: string }) => (
    <div className="rate-row"><span>{label}</span><span className="rate">{[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" aria-label={`${label}: ${n}`} aria-pressed={r[k] >= n} onClick={() => setR({ ...r, [k]: n })}><Icon name="star" size={20} fill={r[k] >= n} stroke={1.6} /></button>
    ))}</span></div>
  );
  return (
    <form className="review-form" onSubmit={async (e) => { e.preventDefault(); try { await api(`/api/v1/orders/${orderId}/review`, { body: { ...r, lang: apiLang(lang) } }); onDone(); } catch { onDone(); } }}>
      <b>{t.reviewTitle}</b>
      <Stars k="rating" label={t.rOverall} /><Stars k="quality" label={t.rQuality} /><Stars k="punctuality" label={t.rPunct} /><Stars k="price_fair" label={t.rPrice} />
      <div className="chips">{t.rTags.map((g) => <button key={g} type="button" className={`chip${r.tags.includes(g) ? " on" : ""}`} onClick={() => setR({ ...r, tags: r.tags.includes(g) ? r.tags.filter((x) => x !== g) : [...r.tags, g] })}>{g}</button>)}</div>
      <textarea className="textarea" placeholder={t.rText} value={r.text} onChange={(e) => setR({ ...r, text: e.target.value })} maxLength={2000} />
      <button type="submit" className="btn lg">{t.rSend}</button>
    </form>
  );
}
