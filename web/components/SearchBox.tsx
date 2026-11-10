"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { apiLang, dict, tx, type Lang } from "@/lib/i18n";

type Res = { categories: { slug: string; name: string; parent_id: number | null }[]; masters: { slug: string; name: string; services: string[] }[] };

export default function SearchBox({ lang, variant = "side", id }: { lang: Lang; variant?: "side" | "hero"; id?: string }) {
  const t = dict(lang);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const ctl = new AbortController();
    const h = setTimeout(async () => {
      try {
        const r = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}&lang=${apiLang(lang)}`, { signal: ctl.signal });
        if (r.ok) { setRes(await r.json()); setAct(0); }
      } catch { /* сеть — молча */ }
    }, 180);
    return () => { clearTimeout(h); ctl.abort(); };
  }, [q, lang]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const links = [
    ...(res?.categories || []).map((c) => ({ href: `/${lang}/usluge/${c.slug}`, label: tx(lang, c.name), note: "" })),
    ...(res?.masters || []).map((m) => ({ href: `/${lang}/majstor/${m.slug}`, label: tx(lang, m.name), note: tx(lang, m.services[0] || "") })),
  ];

  const go = () => {
    const l = links[act];
    setOpen(false);
    if (l) router.push(l.href);
    else if (q.trim()) router.push(`/${lang}/zahtev?q=${encodeURIComponent(q.trim())}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAct((a) => Math.min(a + 1, links.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAct((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(); }
    else if (e.key === "Escape") setOpen(false);
  };

  const pop = open && q.trim().length >= 2 && res && (
    <div className="search-pop" role="listbox">
      {links.length ? links.map((l, i) => (
        <a key={l.href} href={l.href} role="option" aria-selected={i === act} data-active={i === act} onMouseEnter={() => setAct(i)}
          onClick={(e) => { e.preventDefault(); setOpen(false); router.push(l.href); }}>
          <span>{l.label}</span>{l.note && <small>{l.note}</small>}
        </a>
      )) : <div className="none">{lang === "ru" ? "Ничего не нашлось — опиши задачу в заявке" : tx(lang, "Ništa nije pronađeno — opiši posao u zahtevu")}</div>}
    </div>
  );

  if (variant === "hero") {
    return (
      <div className="hero-search" ref={box}>
        <Icon name="search" size={20} stroke={2} />
        <input id={id} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          placeholder={t.searchPh} aria-label={t.search} autoComplete="off" />
        <button type="button" className="btn" onClick={go} aria-label={t.find}><span className="txt">{t.find}</span><Icon name="right" size={18} stroke={2.2} /></button>
        {pop}
      </div>
    );
  }
  return (
    <div className="sb-search hide-c" ref={box}>
      <label className="field">
        <Icon name="search" size={18} stroke={2} />
        <input id={id} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          placeholder={t.search} aria-label={t.search} autoComplete="off" />
        <span className="kbd">⌘K</span>
      </label>
      {pop}
    </div>
  );
}
