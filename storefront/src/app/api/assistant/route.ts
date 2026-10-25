import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/server/customer-fetch";

/* Whether this shop has an assistant, and what it calls itself.
 *
 * Public and unauthenticated on purpose: the floating launcher has to decide
 * whether to render before anyone signs in. Proxied rather than fetched from
 * the browser so the API origin stays a server-side detail, like every other
 * call this app makes. */
export async function GET() {
  try {
    const upstream = await fetch(`${API_BASE_URL}/storefront/assistant/`, {
      // The answer changes when a merchant flips the switch, so a stale cache
      // would leave the bubble on a store that just turned it off.
      cache: "no-store",
    });
    if (!upstream.ok) return NextResponse.json({ enabled: false });
    return NextResponse.json(await upstream.json());
  } catch {
    // A backend that cannot be reached is a backend that cannot answer
    // questions either — no bubble.
    return NextResponse.json({ enabled: false });
  }
}
