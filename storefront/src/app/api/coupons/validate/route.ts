import { customerFetch, proxyJson } from "@/lib/server/customer-fetch";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyJson(await customerFetch("/storefront/coupons/validate/", { method: "POST", body: JSON.stringify(body) }));
}
