import { customerFetch, proxyJson } from "@/lib/server/customer-fetch";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  // customerFetch attaches the auth token when present; guests check out anonymously.
  return proxyJson(await customerFetch("/storefront/checkout/", { method: "POST", body: JSON.stringify(body) }));
}
