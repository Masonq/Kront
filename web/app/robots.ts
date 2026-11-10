import type { MetadataRoute } from "next";
import { SITE } from "@/lib/api";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/*/zahtev", "/*/poruke", "/*/zahtevi", "/*/omiljeni"] }], sitemap: `${SITE}/sitemap.xml` };
}
