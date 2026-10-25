import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

export async function GET() {
  if (!(await getCustomerToken())) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  return proxyJson(await customerFetch("/storefront/orders/"));
}
