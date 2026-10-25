import { NextResponse } from "next/server";
import { API_BASE_URL, drfErrorMessage, setTokenCookie } from "@/lib/server/customer-fetch";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${API_BASE_URL}/auth/google/`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: body.credential }),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(
      { detail: drfErrorMessage(data, "Google sign-in failed. Please try again.") },
      { status: upstream.status }
    );
  }
  const response = NextResponse.json({ user: data.user });
  setTokenCookie(response, data.token);
  return response;
}
