"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";

export default function NeedLogin({ lang, title, photo = "/sec/brave-i-sigurnost.jpg" }: { lang: Lang; title: string; photo?: string }) {
  const t = d2(lang);
  const path = usePathname();
  return (
    <section className="nhero tall">
      <img src={photo} alt="" />
      <div className="nhero-in">
        <h1>{title}</h1>
        <p>{t.loginNeed}</p>
        <Link href={`/${lang}/vhod?next=${encodeURIComponent(path || `/${lang}`)}`} className="btn lg light">{t.login}</Link>
      </div>
    </section>
  );
}
