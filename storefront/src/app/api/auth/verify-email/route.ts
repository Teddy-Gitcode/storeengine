import { NextResponse } from "next/server";
import { API_BASE_URL, drfErrorMessage, setTokenCookie } from "@/lib/server/customer-fetch";

/** Confirming is the last step of signing in, not an errand afterwards — so a
 *  correct code comes back with a token and this is where it becomes a
 *  session. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${API_BASE_URL}/auth/email/verify/`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(
      { detail: drfErrorMessage(data, "That code is not right.") },
      { status: upstream.status },
    );
  }
  const response = NextResponse.json({
    detail: data.detail,
    user: data.user,
    orders_linked: data.orders_linked ?? 0,
    already: data.already === true,
  });
  if (data.token) setTokenCookie(response, data.token);
  return response;
}
