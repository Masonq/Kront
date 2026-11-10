import EmptyPage from "@/components/EmptyPage";
import { dict, type Lang } from "@/lib/i18n";
export const metadata = { robots: { index: false } };
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang; const t = dict(lang);
  return <EmptyPage title={t.msgTitle} text={t.msgEmpty} cta={t.newRequest} href={`/${lang}/zahtev`} icon="msg" />;
}
