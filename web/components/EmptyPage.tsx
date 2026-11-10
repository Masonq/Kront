import Link from "next/link";
import Icon from "./Icon";

export default function EmptyPage({ title, text, cta, href, icon }: { title: string; text: string; cta: string; href: string; icon: string }) {
  return (
    <>
      <h1 className="h1">{title}</h1>
      <div className="empty" style={{ marginTop: 24 }}>
        <span className="cat-card" style={{ minHeight: 0, padding: 0, border: 0, background: "none" }}><span className="ic" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name={icon} size={24} /></span></span>
        <span style={{ maxWidth: 420 }}>{text}</span>
        <Link href={href} className="btn sm">{cta}</Link>
      </div>
    </>
  );
}
