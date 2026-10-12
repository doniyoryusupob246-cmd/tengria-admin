/** Shared between the session route, the API proxy and the middleware. */

export const API_BASE_URL = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "https://tengria-backend.vercel.app").replace(
  /\/$/,
  ""
);

export const SESSION_COOKIE = "tengria_admin_session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // matches the backend's JWT lifetime

/**
 * `httpOnly` keeps the token out of `document.cookie`, `sameSite: "strict"`
 * stops it riding along on cross-site requests, and `secure` is dropped only in
 * local development, where the panel is served over plain HTTP.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE
  };
}
