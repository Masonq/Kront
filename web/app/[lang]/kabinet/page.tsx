import Cabinet from "@/components/Cabinet";
import { api } from "@/lib/api";
import { d2 } from "@/lib/i18n2";
import type { Lang } from "@/lib/i18n";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return { title: d2((await params).lang as Lang).obTitle, robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const [sections, districts] = await Promise.all([api.catalog(lang), api.districts(lang)]);
  return <Cabinet lang={lang} view="dash" sections={(sections || []).map((s) => ({ slug: s.slug, name: s.name, children: s.children.map((c) => ({ slug: c.slug, name: c.name })) }))}
    districts={(districts || []).map((d) => ({ slug: d.slug, name: d.name }))} />;
}
