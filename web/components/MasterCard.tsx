import Link from "next/link";
import Icon from "./Icon";
import FavButton from "./Fav";
import { PickButton } from "./Pick";
import { d2 } from "@/lib/i18n2";
import { dict, tx, type Lang } from "@/lib/i18n";
import { fmtPrice, type MasterCard as M } from "@/lib/api";

export function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function Ava({ m, size = 56 }: { m: Pick<M, "name" | "photo" | "online">; size?: number }) {
  return (
    <span className="mava" style={{ width: size, height: size }}>
      {m.photo ? <img src={m.photo} alt="" /> : initials(m.name)}
      {m.online && <span className="on" />}
    </span>
  );
}

export function Badges({ lang, m }: { lang: Lang; m: M }) {
  const t = dict(lang);
  return (
    <span className="badge-row">
      {m.level >= 1 && (<><Icon name="shield" size={15} stroke={2} /><b>{t.level[Math.min(m.level, 3)]}</b></>)}
      <Icon name="star" size={14} fill /><b>{m.rating.toFixed(1).replace(".", ",")}</b>({m.reviews})
    </span>
  );
}

export default function MasterCard({ lang, m }: { lang: Lang; m: M }) {
  const t = dict(lang);
  const href = `/${lang}/majstor/${m.slug}`;
  return (
    <article className="mcard">
      <div className="cover">
        {m.cover ? <img src={m.cover} alt="" loading="lazy" /> : null}
        {m.demo && <span className="demo-tag">{t.demo}</span>}
        {!m.claimed && <span className="demo-tag">{d2(lang).fromAd}</span>}
        <FavButton slug={m.slug} label={t.favorite} />
        {m.claimed && <PickButton lang={lang} m={{ slug: m.slug, name: m.name, photo: m.photo }} />}
      </div>
      <div className="body">
        <div className="who">
          <Ava m={m} />
          <div className="nm">
            <Link href={href} className="stretch"><b>{tx(lang, m.name)}</b></Link>
            <Badges lang={lang} m={m} />
          </div>
        </div>
        <p className="svc">{tx(lang, m.services.join(", "))}</p>
        <div className="facts">
          <span><Icon name="clock" size={14} stroke={2} />{t.reply(m.reply_min)} · {m.langs.map((l) => l.toUpperCase()).join(", ")}</span>
          <span><Icon name="pin" size={14} stroke={2} />{tx(lang, m.districts.slice(0, 3).join(", "))}{m.districts.length > 3 ? ` +${m.districts.length - 3}` : ""}</span>
        </div>
        <div className="foot">
          <span className="price">{m.price_from ? `${t.from} ${fmtPrice(m.price_from)} RSD` : ""}</span>
          {m.claimed ? <Link href={`/${lang}/zahtev?master=${m.slug}`} className="btn sm">{t.write}</Link>
            : m.tg ? <a href={`https://t.me/${m.tg}`} target="_blank" rel="noopener nofollow" className="btn sm ghost">{d2(lang).writeTg}</a> : null}
        </div>
      </div>
    </article>
  );
}
