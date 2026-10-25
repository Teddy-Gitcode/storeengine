import { NextResponse } from "next/server";
import {
  clearTokenCookie,
  customerFetch,
  drfErrorMessage,
  getCustomerToken,
} from "@/lib/server/customer-fetch";

/**
 * GDPR Art. 17 — close the account, and stop being signed in on this device.
 *
 * The API has already invalidated the token; clearing the cookie here is what
 * makes the browser agree, so the customer isn't left looking at an account
 * page for an account that no longer exists.
 */
export async function POST() {
  if (!(await getCustomerToken())) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const upstream = await customerFetch("/auth/me/delete/", { method: "DELETE" });
  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(
      { detail: drfErrorMessage(data, "Couldn't close your account. Please contact support.") },
      { status: upstream.status }
    );
  }

  const response = NextResponse.json(data);
  clearTokenCookie(response);
  return response;
}
