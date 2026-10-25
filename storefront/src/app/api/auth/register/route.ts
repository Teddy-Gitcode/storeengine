import { NextResponse } from "next/server";
import { API_BASE_URL, drfErrorMessage } from "@/lib/server/customer-fetch";

/** Signing up no longer signs anyone in. The account exists, and it is useless
 *  until the six-digit code sent to the address comes back, so there is no
 *  token here to put in a cookie — the session is issued by /verify-email. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(
      { detail: drfErrorMessage(data, "Could not create the account.") },
      { status: upstream.status },
    );
  }
  return NextResponse.json(
    {
      detail: data.detail,
      email: data.email,
      verification_required: data.verification_required === true,
    },
    { status: 201 },
  );
}
