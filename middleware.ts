import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Server-side gate for the panel.
 *
 * The dashboard layout also redirects, but that runs after the page has already
 * been sent, so a signed-out visitor briefly sees the shell. This turns them
 * away before any panel markup is rendered.
 *
 * It only checks that a session cookie exists — whether the token is still
 * valid, and whether it belongs to an admin, is settled by the backend on every
 * request it guards.
 */
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!hasSession && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except the API routes (which do their own auth), Next's assets
  // and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
