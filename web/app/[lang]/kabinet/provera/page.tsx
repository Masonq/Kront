import { Suspense } from "react";
import Verification from "@/components/Verification";
import { d2 } from "@/lib/i18n2";
import type { Lang } from "@/lib/i18n";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return { title: d2((await params).lang as Lang).verifTitle, robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <Suspense><Verification lang={(await params).lang as Lang} /></Suspense>;
}
