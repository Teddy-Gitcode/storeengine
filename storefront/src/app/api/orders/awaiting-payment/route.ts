import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken, proxyJson } from "@/lib/server/customer-fetch";

/** A signed-in shopper's orders still held unpaid — for the banner. A guest
 *  gets an empty list here; their orders are found by the tokens this browser
 *  kept at checkout. */
export async function GET() {
  if (!(await getCustomerToken())) return NextResponse.json([]);
  return proxyJson(await customerFetch("/storefront/orders/awaiting-payment/"));
}
