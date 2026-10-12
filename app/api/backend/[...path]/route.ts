import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * Forwards panel requests to the Tengria API, attaching the access token from
 * the HttpOnly session cookie.
 *
 * The panel calls this instead of the backend directly, which is what lets the
 * token stay unreadable to client JavaScript. Only the caller's method, path,
 * query and JSON body cross over — no client-supplied headers are relayed, so
 * the browser cannot inject its own Authorization.
 */
async function proxy(request: NextRequest, path: string[]) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const target = `${API_BASE_URL}/${path.join("/")}${request.nextUrl.search}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const hasBody = request.method !== "GET" && request.method !== "DELETE";
  let body: string | undefined;

  if (hasBody) {
    const raw = await request.text();
    if (raw) {
      headers["Content-Type"] = "application/json";
      body = raw;
    }
  }

  const upstream = await fetch(target, { method: request.method, headers, body, cache: "no-store" });
  const text = await upstream.text();

  const response = new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" }
  });

  // An expired or revoked token should not linger in the browser.
  if (upstream.status === 401) {
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  }

  return response;
}

// Next 15 made dynamic route params asynchronous; awaiting the promise is the
// supported shape from 15 onwards.
type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  return proxy(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: Context) {
  return proxy(request, (await params).path);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  return proxy(request, (await params).path);
}

export async function PUT(request: NextRequest, { params }: Context) {
  return proxy(request, (await params).path);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  return proxy(request, (await params).path);
}
