/** Shared between the session route, the API proxy and the middleware. */

export const API_BASE_URL = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "https://tengria-backend.vercel.app").replace(
  /\/$/,
  ""
);

import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "tengria_admin_session";
export const REFRESH_COOKIE = "tengria_admin_refresh";

// The backend's refresh-token lifetime. The access token in SESSION_COOKIE
// runs out much sooner (an hour) and is renewed with the refresh token.
const SESSION_MAX_AGE = 60 * 60 * 24 * 60;

export type SessionTokens = { accessToken: string; refreshToken?: string };

/**
 * `httpOnly` keeps the token out of `document.cookie`, and `secure` is dropped
 * only in local development, where the panel is served over plain HTTP.
 *
 * `sameSite: "lax"`, not "strict": with strict, a tab opened from a link on
 * another site (Vercel's dashboard, a chat) loads without the cookie, and
 * Chrome keeps treating every reload of that tab as cross-site, so the panel
 * fell back to the login page on each refresh. Lax still keeps the cookie off
 * cross-site POSTs and background requests, which is what CSRF needs.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE
  };
}

export function setSessionCookies(response: NextResponse, tokens: SessionTokens) {
  response.cookies.set(SESSION_COOKIE, tokens.accessToken, sessionCookieOptions());
  if (tokens.refreshToken) response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, sessionCookieOptions());
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

const renewing = new Map<string, Promise<SessionTokens | null>>();

/**
 * Trades a refresh token for a new pair, or null if the backend refuses it.
 * The backend spends a refresh token on first use, and the panel often fires
 * several requests at once; they share one trade while this instance is up.
 */
export function renewSession(refreshToken: string): Promise<SessionTokens | null> {
  let pending = renewing.get(refreshToken);
  if (!pending) {
    pending = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store"
    })
      .then(async (response) => (response.ok ? ((await response.json()) as SessionTokens) : null))
      .catch(() => null)
      .finally(() => {
        // Kept a moment so requests arriving just after still share the answer.
        setTimeout(() => renewing.delete(refreshToken), 10_000);
      });
    renewing.set(refreshToken, pending);
  }
  return pending;
}
