import { NextResponse } from "next/server";
import { clearTokenCookie, customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

export async function GET() {
  if (!(await getCustomerToken())) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }
  const upstream = await customerFetch("/auth/me/");
  if (upstream.status === 401 || upstream.status === 403) {
    // Token was revoked upstream — drop the stale cookie so the UI signs out.
    const response = NextResponse.json({ detail: "Session expired." }, { status: 401 });
    clearTokenCookie(response);
    return response;
  }
  return proxyJson(upstream);
}

export async function PATCH(request: Request) {
  if (!(await getCustomerToken())) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const upstream = await customerFetch("/auth/me/", { method: "PATCH", body: JSON.stringify(body) });
  return proxyJson(upstream);
}
