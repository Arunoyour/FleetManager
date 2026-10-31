import { NextResponse, type NextRequest } from "next/server";

// Cheap gate: no session cookie -> login. Pages and actions still validate the session (expiry, idle lock).
export function middleware(req: NextRequest) {
  if (!req.cookies.has("fm_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/|icons/|icon|apple-icon|manifest.webmanifest|sw.js|offline.html|favicon.ico).*)"],
};
