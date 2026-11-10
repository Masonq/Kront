"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";
import { type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, useMe } from "@/lib/me";

export default function WriteChat({ lang, slug, className = "btn lg ghost" }: { lang: Lang; slug: string; className?: string }) {
  const t = d2(lang);
  const router = useRouter();
  const { me } = useMe();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!me) { router.push(`/${lang}/vhod?next=${encodeURIComponent(`/${lang}/majstor/${slug}`)}`); return; }
    setBusy(true);
    try { const r = await api<{ id: number }>(`/api/v1/masters/${slug}/conversation`, { method: "POST" }); router.push(`/${lang}/poruke/${r.id}`); } catch { setBusy(false); }
  };
  if (me?.master?.slug === slug) return null;
  return <button type="button" className={className} onClick={go} disabled={busy}><Icon name="msg" size={18} />{t.writeChat}</button>;
}
