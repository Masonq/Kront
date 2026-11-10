import type { Metadata } from "next";
import { LANGS, type Lang } from "./i18n";
import { SITE } from "./api";

export function alternates(lang: Lang, rest: string): Metadata["alternates"] {
  const r = rest ? `/${rest}` : "";
  return {
    canonical: `${SITE}/${lang}${r}`,
    languages: Object.fromEntries(LANGS.map((l) => [l === "sr" ? "sr-Latn" : l === "sr-cyrl" ? "sr-Cyrl" : "ru", `${SITE}/${l}${r}`])),
  };
}
