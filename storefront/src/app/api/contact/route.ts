import { NextResponse } from "next/server";
import { API_BASE_URL, drfErrorMessage } from "@/lib/server/customer-fetch";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${API_BASE_URL}/storefront/contact/`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(
      { detail: drfErrorMessage(data, "Couldn't send your message. Please try again.") },
      { status: upstream.status }
    );
  }
  return NextResponse.json(data);
}
