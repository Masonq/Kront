"use client";
import Link from "next/link";

export default function HeroCardClient({ photo, title, sub, text, cta, href }: { photo: string; title: string; sub?: string; text?: string; cta?: string; href?: string }) {
  return (
    <section className="nhero tall">
      <img src={photo} alt="" />
      <div className="nhero-in">
        <h1>{title}</h1>
        {sub && <span className="role">{sub}</span>}
        {text && <p>{text}</p>}
        {cta && href && <Link href={href} className="btn lg light">{cta}</Link>}
      </div>
    </section>
  );
}
