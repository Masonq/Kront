import Claim from "@/components/Claim";
import type { Lang } from "@/lib/i18n";
export const metadata = { title: "Kront", robots: { index: false } };
export default async function Page({ params }: { params: Promise<{ lang: string; token: string }> }) {
  const { lang, token } = await params;
  return <Claim lang={lang as Lang} token={token} />;
}
