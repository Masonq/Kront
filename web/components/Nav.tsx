"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon, { Nut } from "./Icon";
import SearchBox from "./SearchBox";
import { dict, tx, LANGS, type Lang } from "@/lib/i18n";
import type { Section } from "@/lib/api";

const LANG_LABEL: Record<Lang, string> = { sr: "Lat", "sr-cyrl": "Ћир", ru: "RU" };

function setCookie(k: string, v: string) {
  document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`;
}

export default function Nav({ lang, sections }: { lang: Lang; sections: Section[] }) {
  const t = dict(lang);
  const path = usePathname() || "";
  const [drawer, setDrawer] = useState(false);
  const [dark, setDark] = useState(false);
  const [catOpen, setCatOpen] = useState(true);

  useEffect(() => {
    const th = document.documentElement.dataset.theme;
    setDark(th === "dark" || (th === "system" && matchMedia("(prefers-color-scheme: dark)").matches));
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (document.documentElement.dataset.sb === "c") toggleSb();
        setTimeout(() => (document.getElementById("sb-q") as HTMLInputElement | null)?.focus(), 230);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  useEffect(() => { setDrawer(false); }, [path]);

  function toggleSb() {
    const el = document.documentElement;
    const next = el.dataset.sb === "c" ? "e" : "c";
    el.dataset.sb = next;
    setCookie("kront_sb", next);
  }
  function toggleTheme() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setCookie("kront_theme", next);
    setDark(!dark);
  }

  const here = (href: string, exact = false) => (exact ? path === href : path === href || path.startsWith(href + "/"));
  const rest = path.split("/").slice(2).join("/");
  const item = (href: string, icon: string, label: string, extra?: React.ReactNode, exact = false) => (
    <Link href={href} className="sb-item" aria-current={here(href, exact) ? "page" : undefined} aria-label={label}>
      <Icon name={icon} />
      <span className="txt">{label}</span>
      {extra}
      <span className="tip">{label}</span>
    </Link>
  );

  return (
    <>
      <header className="mtop">
        <Link href={`/${lang}`} className="sb-brand" aria-label="Kront">
          <Nut size={28} />
          <span className="sb-name"><b>kront</b></span>
        </Link>
        <button type="button" className="ava" onClick={() => setDrawer(true)} aria-label={t.menu} aria-expanded={drawer}>
          <Icon name="menu" size={20} stroke={2} />
        </button>
      </header>

      <div className={`drawer-scrim${drawer ? " open" : ""}`} onClick={() => setDrawer(false)} aria-hidden="true" />

      <aside className={`sb${drawer ? " open" : ""}`} aria-label={t.menu}>
        <div className="sb-head">
          <Link href={`/${lang}`} className="sb-brand" aria-label="Kront">
            <Nut size={32} />
            <span className="sb-name hide-c"><b>kront</b><span>{t.brandSub}</span></span>
          </Link>
          <button type="button" className="round-btn sb-toggle" onClick={() => (drawer ? setDrawer(false) : toggleSb())} aria-label={t.collapse}>
            <Icon name={drawer ? "close" : "left"} size={16} stroke={2} />
          </button>
        </div>

        <SearchBox lang={lang} id="sb-q" />
        <div className="sb-nav sb-search-c">
          <button type="button" className="sb-item" onClick={() => { toggleSb(); setTimeout(() => document.getElementById("sb-q")?.focus(), 230); }} aria-label={t.search}>
            <Icon name="search" stroke={2} /><span className="tip">{t.search}<span className="kbd">⌘K</span></span>
          </button>
        </div>

        <div className="sb-label hide-c">{t.main}</div>
        <nav className="sb-nav" aria-label={t.main}>
          {item(`/${lang}`, "home", t.home, undefined, true)}
          {item(`/${lang}/usluge`, "find", t.find)}
          {item(`/${lang}/zahtevi`, "orders", t.orders)}
          {item(`/${lang}/poruke`, "msg", t.messages)}
          {item(`/${lang}/omiljeni`, "heart", t.favorites)}
        </nav>

        <div className="sb-div" />
        <div className="sb-label hide-c">{t.catalog}</div>
        <div className="sb-nav">
          <button type="button" className="sb-item" aria-expanded={catOpen} onClick={() => setCatOpen(!catOpen)} aria-label={t.sections}>
            <Icon name="grid" />
            <span className="txt">{t.sections}</span>
            <span className={`sb-chev hide-c${catOpen ? "" : " closed"}`}><Icon name="down" size={16} stroke={2} /></span>
            <span className="tip">{t.sections}</span>
          </button>
          {catOpen && (
            <div className="sb-nav hide-c">
              {sections.slice(0, 6).map((s) => (
                <Link key={s.slug} href={`/${lang}/usluge/${s.slug}`} className="sb-item sb-sub" aria-current={here(`/${lang}/usluge/${s.slug}`) ? "page" : undefined}>
                  <span className="dot" />
                  <span className="txt">{tx(lang, s.name)}</span>
                  {s.count > 0 && <span className="n">{s.count}</span>}
                </Link>
              ))}
              <Link href={`/${lang}/usluge`} className="sb-item sb-sub" style={{ color: "var(--muted)" }}>
                <span className="dot" /><span className="txt">{t.allSections}</span>
              </Link>
            </div>
          )}
        </div>

        <div className="sb-foot">
          <div className="sb-row hide-c">
            <Icon name="globe" />
            <span>{t.lang}</span>
            <span className="langs">
              {LANGS.map((l) => (
                <Link key={l} href={`/${l}${rest ? "/" + rest : ""}`} aria-current={l === lang ? "true" : undefined} hrefLang={l}>{LANG_LABEL[l]}</Link>
              ))}
            </span>
          </div>
          <div className="sb-row">
            <span className="hide-c" style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="moon" />{t.night}</span>
            <button type="button" role="switch" className="switch" aria-checked={dark} aria-label={t.night} onClick={toggleTheme} />
          </div>
          <Link href={`/${lang}/postani-majstor`} className="user-card" aria-label={t.becomeMaster}>
            <span className="ava"><Icon name="user" size={18} /></span>
            <span className="who hide-c"><b>{t.guest}</b><span>{t.becomeMaster}</span></span>
            <span className="hide-c" style={{ color: "var(--muted)", display: "inline-flex" }}><Icon name="right" size={18} stroke={2} /></span>
          </Link>
        </div>
      </aside>

      <nav className="mbar" aria-label={t.main}>
        <Link href={`/${lang}`} aria-current={here(`/${lang}`, true) ? "page" : undefined}><Icon name="home" size={22} />{t.home}</Link>
        <Link href={`/${lang}/usluge`} aria-current={here(`/${lang}/usluge`) ? "page" : undefined}><Icon name="search" size={22} />{t.search}</Link>
        <Link href={`/${lang}/zahtev`} aria-label={t.newRequest}><span className="plus"><Icon name="plus" size={24} stroke={2.4} /></span></Link>
        <Link href={`/${lang}/poruke`} aria-current={here(`/${lang}/poruke`) ? "page" : undefined}><Icon name="msg" size={22} />{t.messages}</Link>
        <Link href={`/${lang}/zahtevi`} aria-current={here(`/${lang}/zahtevi`) ? "page" : undefined}><Icon name="orders" size={22} />{t.orders}</Link>
      </nav>
    </>
  );
}
