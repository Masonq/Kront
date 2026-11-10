import EmptyPage from "@/components/EmptyPage";
import { dict, type Lang } from "@/lib/i18n";
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang; const t = dict(lang);
  return <EmptyPage title={t.forMastersTitle} text={`${t.becomeText} ${t.becomeSoon}`} cta={t.home} href={`/${lang}`} icon="tool" />;
}
