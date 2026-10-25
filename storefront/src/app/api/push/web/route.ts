import { customerFetch, proxyJson } from "@/lib/server/customer-fetch";

/** A browser that agreed to notifications. Proxied so a signed-in shopper's
 *  subscription is tied to their account as well as to the order. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyJson(
    await customerFetch("/storefront/push/web/subscriptions/", { method: "POST", body: JSON.stringify(body) }),
  );
}
