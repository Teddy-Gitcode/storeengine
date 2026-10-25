import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/server/customer-fetch";

/* Naming the point a customer dropped. See ../suggest/route.ts for why this
 * hop exists at all. */

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = params.get("lat");
  const lon = params.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ detail: "lat and lon are required." }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${API_BASE_URL}/geocode/reverse/?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      { cache: "no-store", headers: { Accept: "application/json" } },
    );
    if (!upstream.ok) return NextResponse.json({ result: null, unavailable: "upstream_error" });
    return NextResponse.json(await upstream.json());
  } catch {
    // The pin is already placed and already saved; naming it is a courtesy,
    // and a courtesy is allowed to fail quietly.
    return NextResponse.json({ result: null, unavailable: "unreachable" });
  }
}
