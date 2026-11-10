import Chats from "@/components/Chats";
import { dict, type Lang } from "@/lib/i18n";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return { title: dict((await params).lang as Lang).msgTitle, robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <Chats lang={(await params).lang as Lang} />;
}
