import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Onest, Unbounded } from "next/font/google";
import Nav from "@/components/Nav";
import { PickBar } from "@/components/Pick";
import { api } from "@/lib/api";
import { dict, htmlLang, isLang, type Lang } from "@/lib/i18n";
import "../globals.css";

const text = Onest({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--f-text", display: "swap" });
const display = Unbounded({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["300", "400"], variable: "--f-display", display: "swap" });

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F4F4F5" }, { media: "(prefers-color-scheme: dark)", color: "#1C1C1E" }],
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = (isLang(lang) ? lang : "sr") as Lang;
  return {
    title: { default: `Kront — ${dict(l).brandSub}`, template: "%s — Kront" },
    description: dict(l).heroText,
    icons: { icon: "/icon.svg", apple: "/icon-192.png" },
    manifest: "/manifest.webmanifest",
  };
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const jar = await cookies();
  const sb = jar.get("kront_sb")?.value === "c" ? "c" : "e";
  const theme = ["light", "dark"].includes(jar.get("kront_theme")?.value || "") ? jar.get("kront_theme")!.value : "system";
  const sections = (await api.catalog(lang)) || [];
  const t = dict(lang);
  return (
    <html lang={htmlLang(lang)} data-sb={sb} data-theme={theme} className={`${text.variable} ${display.variable}`}>
      <body>
        <div className="shell">
          <Nav lang={lang} sections={sections} initialMode={jar.get("kront_mode")?.value === "master" ? "master" : "client"} />
          <main className="content" id="main">
            {children}
            <footer className="footer"><span>{t.footer}</span><span>© {new Date().getFullYear()} Kront</span></footer>
          </main>
          <PickBar lang={lang} />
        </div>
      </body>
    </html>
  );
}
