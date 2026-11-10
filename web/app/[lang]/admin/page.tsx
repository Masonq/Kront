import Admin from "@/components/Admin";
import type { Lang } from "@/lib/i18n";
export const metadata = { title: "Admin", robots: { index: false } };
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <Admin lang={(await params).lang as Lang} />;
}
