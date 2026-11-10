"use client";
import { useEffect, useState } from "react";
import HeroCardClient from "./HeroCardClient";
import MasterCard from "./MasterCard";
import { apiLang, dict, type Lang } from "@/lib/i18n";
import { FAV, EMPTY_STR, useStored } from "@/lib/local";
import type { MasterCard as M } from "@/lib/api";

export default function FavList({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const fav = useStored<string[]>(FAV, EMPTY_STR);
  const [items, setItems] = useState<M[] | null>(null);
  useEffect(() => {
    if (!fav.length) { setItems([]); return; }
    fetch(`/api/v1/masters?slugs=${fav.join(",")}&lang=${apiLang(lang)}`).then((r) => r.json()).then((j) => setItems(j.items)).catch(() => setItems([]));
  }, [fav, lang]);
  if (items === null) return <div className="nhero tall skeleton" aria-busy="true" />;
  if (!items.length) return <HeroCardClient photo="/sec/ljubimci.jpg" title={t.favTitle} text={t.favEmpty} cta={t.find} href={`/${lang}/usluge`} />;
  return (
    <>
      <h1 className="h1">{t.favTitle}</h1>
      <div className="grid-m">{items.map((m) => <MasterCard key={m.slug} lang={lang} m={m} />)}</div>
    </>
  );
}
