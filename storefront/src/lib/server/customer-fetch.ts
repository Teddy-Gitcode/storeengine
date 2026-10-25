import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Server-only helpers for talking to the Django API on behalf of the signed-in
// customer. The DRF token lives in an httpOnly cookie so it never reaches
// client JS; every authed call is proxied through a route handler that uses
// these helpers (mirrors apps/admin's adminFetch pattern).

import { API_BASE } from "../api-base";

export const API_BASE_URL = API_BASE;

export const CUSTOMER_TOKEN_COOKIE = "customer_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getCustomerToken() {
  return (await cookies()).get(CUSTOMER_TOKEN_COOKIE)?.value;
}

/**
 * `remember` false omits maxAge, which makes it a session cookie: the sign-in
 * lasts until the browser is closed. That is what "keep me signed in", left
 * unticked, has to mean on a shared machine.
 */
export function setTokenCookie(response: NextResponse, token: string, remember = true) {
  response.cookies.set(CUSTOMER_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: COOKIE_MAX_AGE } : {}),
  });
}

export function clearTokenCookie(response: NextResponse) {
  response.cookies.set(CUSTOMER_TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Raw fetch against Django, attaching the customer token when present. */
export async function customerFetch(path: string, init: RequestInit = {}) {
  const token = await getCustomerToken();
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

/** Flatten a DRF error payload ({detail} | {field: [msgs]} | {non_field_errors}) into one message. */
export function drfErrorMessage(data: unknown, fallback = "Something went wrong."): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    const messages = Array.isArray(value) ? value : [value];
    const text = messages.filter((m) => typeof m === "string").join(" ");
    if (text) parts.push(key === "non_field_errors" ? text : `${key}: ${text}`);
  }
  return parts.join(" ") || fallback;
}

/** Proxy a Django response body + status back to the browser. */
export async function proxyJson(response: Response) {
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ detail: drfErrorMessage(data) }, { status: response.status });
  }
  return NextResponse.json(data, { status: response.status });
}
