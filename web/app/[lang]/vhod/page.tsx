import { Suspense } from "react";
import Login from "@/components/Login";
import { d2 } from "@/lib/i18n2";
import type { Lang } from "@/lib/i18n";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return { title: d2((await params).lang as Lang).login, robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <Suspense><Login lang={(await params).lang as Lang} /></Suspense>;
}
