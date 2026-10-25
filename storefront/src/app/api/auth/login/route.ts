import { NextResponse } from "next/server";
import { API_BASE_URL, drfErrorMessage, setTokenCookie } from "@/lib/server/customer-fetch";

export async function POST(request: Request) {
  const { remember, ...credentials } = await request
    .json()
    .catch(() => ({}) as { remember?: boolean });
  const upstream = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    // The password was right but the address was never confirmed. That is not
    // a failed sign-in and must not read as one: a code has just been sent, so
    // the caller needs to know where to take them.
    return NextResponse.json(
      {
        detail: drfErrorMessage(data, "Invalid email or password."),
        ...(data.verification_required === true
          ? { verification_required: true, email: data.email }
          : {}),
      },
      { status: upstream.status },
    );
  }
  const response = NextResponse.json({ user: data.user });
  setTokenCookie(response, data.token, remember !== false);
  return response;
}
