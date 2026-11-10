"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { dict, type Lang } from "@/lib/i18n";
import { PICK, EMPTY_PICK, useStored, write, type Picked } from "@/lib/local";

export function PickButton({ lang, m }: { lang: Lang; m: Picked }) {
  const t = dict(lang);
  const picks = useStored<Picked[]>(PICK, EMPTY_PICK);
  const on = picks.some((p) => p.slug === m.slug);
  const full = !on && picks.length >= 3;
  return (
    <button type="button" className={`pick${on ? " on" : ""}`} aria-pressed={on} disabled={full}
      aria-label={on ? t.pickRemove : t.pickAdd} title={full ? t.pickHint : on ? t.pickRemove : t.pickAdd}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); write(PICK, on ? picks.filter((p) => p.slug !== m.slug) : [...picks, m]); }}>
      <Icon name={on ? "check" : "plus"} size={on ? 14 : 15} stroke={on ? 3.2 : 2.8} />
    </button>
  );
}

export function PickBar({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const picks = useStored<Picked[]>(PICK, EMPTY_PICK);
  const path = usePathname() || "";
  if (!picks.length || path.endsWith("/zahtev")) return null;
  return (
    <div className="pickbar" role="region" aria-label={t.pickBar(picks.length)}>
      <button type="button" className="pb-clear" onClick={() => write(PICK, [])} aria-label={t.pickClear}><Icon name="close" size={16} stroke={2.2} /></button>
      <span className="pb-avas" aria-hidden="true">
        {picks.map((p) => <span key={p.slug} className="pb-ava">{p.photo ? <img src={p.photo} alt="" /> : p.name.split(/\s+/).map((x) => x[0]).join("").slice(0, 2)}</span>)}
      </span>
      <Link href={`/${lang}/zahtev?masters=${picks.map((p) => p.slug).join(",")}`} className="pb-go">
        <span className="pb-long">{t.pickBar(picks.length)}&nbsp;·&nbsp;</span><span className="pb-short">{picks.length}/3&nbsp;·&nbsp;</span>{t.pickSend}
      </Link>
    </div>
  );
}
