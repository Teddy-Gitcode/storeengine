import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

// Built per request: a Response body can only be read once, so a shared
// instance would fail on the second unauthenticated call this process serves.
const unauthenticated = () => NextResponse.json({ detail: "Not signed in." }, { status: 401 });

export async function GET() {
  if (!(await getCustomerToken())) return unauthenticated();
  return proxyJson(await customerFetch("/storefront/my/support/tickets/"));
}

export async function POST(request: Request) {
  if (!(await getCustomerToken())) return unauthenticated();
  return proxyJson(
    await customerFetch("/storefront/my/support/tickets/", {
      method: "POST",
      body: JSON.stringify(await request.json()),
    }),
  );
}
