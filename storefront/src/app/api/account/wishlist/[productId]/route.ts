import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

type Params = { params: Promise<{ productId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await getCustomerToken())) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  const { productId } = await params;
  return proxyJson(await customerFetch(`/storefront/wishlist/${encodeURIComponent(productId)}/`, { method: "DELETE" }));
}
