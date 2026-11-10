import Link from "next/link";
import Icon from "./Icon";

export default function HeroCard({ photo, title, sub, text, cta, href, back, children, tall = false }: {
  photo: string; title: string; sub?: string; text?: string; cta?: string; href?: string; back?: string; children?: React.ReactNode; tall?: boolean;
}) {
  return (
    <section className={`nhero${tall ? " tall" : ""}`}>
      <img src={photo} alt="" />
      {back && <Link href={back} className="glass-btn nhero-back" aria-label="←"><Icon name="left" size={18} stroke={2.2} /></Link>}
      <div className="nhero-in">
        <h1>{title}</h1>
        {sub && <span className="role">{sub}</span>}
        {text && <p>{text}</p>}
        {cta && href && <Link href={href} className="btn lg light">{cta}</Link>}
        {children}
      </div>
    </section>
  );
}
