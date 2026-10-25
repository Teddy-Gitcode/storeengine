import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

export async function POST(request: Request) {
  if (!(await getCustomerToken())) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  return proxyJson(await customerFetch("/storefront/wishlist/merge/", { method: "POST", body: JSON.stringify(body) }));
}
