import HeroCard from "@/components/HeroCard";
import { dict, type Lang } from "@/lib/i18n";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return { title: dict((await params).lang as Lang).msgTitle, robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang; const t = dict(lang);
  return <HeroCard tall photo="/sec/casovi.jpg" title={t.msgTitle} sub={t.msgSub} text={t.msgEmpty} cta={t.newRequest} href={`/${lang}/zahtev`} />;
}
