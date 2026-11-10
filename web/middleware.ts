import { NextResponse, type NextRequest } from "next/server";

const LANGS = ["sr", "sr-cyrl", "ru"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (LANGS.includes(first)) return NextResponse.next();
  const al = req.headers.get("accept-language") || "";
  const lang = /\bru\b|ru-/i.test(al) && !/^sr/i.test(al) ? "ru" : "sr";
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next|demo|sec|sw.js|icon-192.png|icon-512.png|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest).*)"] };
