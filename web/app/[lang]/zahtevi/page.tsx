import OrdersList from "@/components/OrdersList";
import { dict, type Lang } from "@/lib/i18n";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return { title: dict((await params).lang as Lang).ordersTitle, robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <OrdersList lang={(await params).lang as Lang} />;
}
