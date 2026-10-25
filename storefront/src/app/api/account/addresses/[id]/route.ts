import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await getCustomerToken())) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return proxyJson(await customerFetch(`/storefront/addresses/${id}/`, { method: "PATCH", body: JSON.stringify(body) }));
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await getCustomerToken())) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  const { id } = await params;
  return proxyJson(await customerFetch(`/storefront/addresses/${id}/`, { method: "DELETE" }));
}
