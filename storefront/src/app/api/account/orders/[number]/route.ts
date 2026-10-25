import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

type Params = { params: Promise<{ number: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await getCustomerToken())) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  const { number } = await params;
  return proxyJson(await customerFetch(`/storefront/orders/${encodeURIComponent(number)}/`));
}
