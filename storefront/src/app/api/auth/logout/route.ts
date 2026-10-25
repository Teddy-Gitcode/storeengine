import { NextResponse } from "next/server";
import { clearTokenCookie, customerFetch, getCustomerToken } from "@/lib/server/customer-fetch";

export async function POST() {
  if (await getCustomerToken()) {
    await customerFetch("/auth/logout/", { method: "POST" }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  clearTokenCookie(response);
  return response;
}
