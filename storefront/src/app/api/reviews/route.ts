import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

export async function POST(request: Request) {
  if (!(await getCustomerToken())) {
    return NextResponse.json({ detail: "Sign in to write a review." }, { status: 401 });
  }
  const { slug, ...review } = await request.json().catch(() => ({} as Record<string, unknown>));
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ detail: "Missing product." }, { status: 400 });
  }
  return proxyJson(
    await customerFetch(`/catalog/products/${encodeURIComponent(slug)}/reviews/`, {
      method: "POST",
      body: JSON.stringify(review),
    })
  );
}
