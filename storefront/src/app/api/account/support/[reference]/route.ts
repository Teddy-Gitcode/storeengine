import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  if (!(await getCustomerToken())) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }
  const { reference } = await params;
  return proxyJson(
    await customerFetch(`/storefront/my/support/tickets/${encodeURIComponent(reference)}/`),
  );
}
