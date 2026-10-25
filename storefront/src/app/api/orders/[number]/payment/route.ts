import { customerFetch, proxyJson } from "@/lib/server/customer-fetch";
import { NextResponse } from "next/server";

/* The pay page's two calls. Proxied so a signed-in owner is recognised by
   their cookie; a guest is let in by the order's pay token, which is passed
   through untouched. The 409 a refused retry answers carries the current hold
   and a reason code, so it is passed through whole rather than flattened. */

type Params = { params: Promise<{ number: string }> };

export async function GET(request: Request, { params }: Params) {
  const { number } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const query = token ? `?t=${encodeURIComponent(token)}` : "";
  return proxyJson(await customerFetch(`/storefront/orders/${encodeURIComponent(number)}/payment/${query}`));
}

export async function POST(request: Request, { params }: Params) {
  const { number } = await params;
  const body = await request.json().catch(() => ({}));
  const response = await customerFetch(`/storefront/orders/${encodeURIComponent(number)}/payment/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (response.status === 409) {
    return NextResponse.json(await response.json().catch(() => ({})), { status: 409 });
  }
  return proxyJson(response);
}
