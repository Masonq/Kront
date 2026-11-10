import Link from "next/link";
import Icon from "./Icon";
import { dict, tx, type Lang } from "@/lib/i18n";
import { sectionPhoto } from "@/lib/sections";
import type { Section } from "@/lib/api";

export default function SectionTile({ lang, s, big = false }: { lang: Lang; s: Section; big?: boolean }) {
  const t = dict(lang);
  const photo = sectionPhoto(s.slug);
  const shown = big ? 3 : 2;
  const more = s.children.length - shown;
  return (
    <div className={`stile${photo ? "" : " nophoto"}${big ? " big" : ""}`}>
      {photo ? <img src={photo} alt="" loading="lazy" /> : <span className="stile-ic"><Icon name={s.icon} size={34} stroke={1.5} /></span>}
      <span className="stile-top">
        <span className="glass-pill">{s.count ? t.masters(s.count) : t.servicesN(s.children.length)}</span>
      </span>
      <span className="stile-bottom">
        <Link href={`/${lang}/usluge/${s.slug}`} className="stile-name stretch">{tx(lang, s.name)}</Link>
        <span className="stile-subs">
          {s.children.slice(0, shown).map((c) => (
            <Link key={c.slug} href={`/${lang}/usluge/${c.slug}`} className="glass-pill sm">{tx(lang, c.name)}</Link>
          ))}
          {more > 0 && <span className="glass-pill sm">+{more}</span>}
        </span>
      </span>
    </div>
  );
}
