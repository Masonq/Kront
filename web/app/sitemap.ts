import type { MetadataRoute } from "next";
import { api, SITE } from "@/lib/api";
import { LANGS } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sm = await api.sitemap();
  const paths = ["", "/usluge"];
  if (sm) {
    for (const c of sm.categories) paths.push(`/usluge/${c}`);
    for (const [c, d] of sm.pairs) paths.push(`/usluge/${c}/${d}`);
  }
  const now = new Date();
  return paths.flatMap((p) => LANGS.map((l) => ({ url: `${SITE}/${l}${p}`, lastModified: now, changeFrequency: "daily" as const })));
}
