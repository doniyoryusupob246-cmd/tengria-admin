import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL, REFRESH_COOKIE, SESSION_COOKIE, clearSessionCookies, renewSession, setSessionCookies } from "@/lib/session";

/**
 * Sign-in happens here rather than in the browser so the access token never
 * reaches client JavaScript: it goes straight from the backend into an
 * HttpOnly cookie. An XSS in the panel can then abuse the session while the
 * page is open, but it cannot read the token and replay it elsewhere.
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ message: "E-posta ve şifre gerekli." }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password })
  });

  const payload = (await upstream.json().catch(() => null)) as
    | { accessToken?: string; refreshToken?: string; user?: { role?: string }; message?: string }
    | null;

  if (!upstream.ok || !payload?.accessToken) {
    return NextResponse.json(
      { message: payload?.message ?? "Giriş yapılamadı." },
      { status: upstream.status === 200 ? 502 : upstream.status }
    );
  }

  // The backend guards every /admin route by role as well; refusing here keeps
  // a non-admin from holding a panel session they could not use anyway.
  if (payload.user?.role !== "ADMIN") {
    return NextResponse.json({ message: "Bu hesabın yönetici paneline erişim yetkisi yok." }, { status: 403 });
  }

  const response = NextResponse.json({ user: payload.user });
  setSessionCookies(response, { accessToken: payload.accessToken, refreshToken: payload.refreshToken });
  return response;
}

/** Reads the current session so the panel can restore it after a reload. */
export async function GET(request: NextRequest) {
  let token = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!token && !refreshToken) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const fetchMe = (accessToken: string | undefined) =>
    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), Accept: "application/json" },
      cache: "no-store"
    });

  let upstream = await fetchMe(token);
  // Past the access token's hour: renew it before giving up on the session.
  const renewed = upstream.status === 401 && refreshToken ? await renewSession(refreshToken) : null;
  if (renewed) {
    token = renewed.accessToken;
    upstream = await fetchMe(token);
  }

  if (!upstream.ok) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const payload = (await upstream.json()) as { user?: { role?: string } };

  if (payload.user?.role !== "ADMIN") {
    const response = NextResponse.json({ user: null }, { status: 403 });
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ user: payload.user });
  if (renewed) setSessionCookies(response, renewed);
  return response;
}

export async function DELETE(request: NextRequest) {
  // Ends the sign-in on the backend too, so the refresh token can't be reused.
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken })
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
