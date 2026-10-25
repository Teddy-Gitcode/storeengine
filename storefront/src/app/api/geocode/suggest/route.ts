import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/server/customer-fetch";

/* The browser half of the address proxy.
 *
 * AddressPicker calls a relative "/api/geocode/…" so that it works wherever
 * the storefront is served from. Django lives on another origin entirely, and
 * under Docker at a hostname only containers can resolve — so the hop has to
 * happen on the server, exactly as every other /api/* handler here does it.
 *
 * Unauthenticated on purpose: a shopper searches for their address before
 * they have any reason to have signed in. The upstream is throttled and
 * caches, which is what keeps that safe.
 */

/** Never an error status. See the `unavailable` contract in apps/core/geocoding.py. */
const UNAVAILABLE = (reason: string) => NextResponse.json({ results: [], unavailable: reason });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? "";
  // The same floor the upstream enforces, applied here so a two-letter query
  // does not cost a round trip to Django to be told it was too short.
  if (query.trim().length < 3) return NextResponse.json({ results: [] });

  // Which country to search in. Passed straight through and validated upstream,
  // where a bad value falls back to the store's own country — this hop has no
  // better answer than Django does, so it does not invent one.
  const country = params.get("country");

  try {
    const upstream = await fetch(
      `${API_BASE_URL}/geocode/suggest/?q=${encodeURIComponent(query)}` +
        (country ? `&country=${encodeURIComponent(country)}` : ""),
      { cache: "no-store", headers: { Accept: "application/json" } },
    );
    if (!upstream.ok) return UNAVAILABLE("upstream_error");
    return NextResponse.json(await upstream.json());
  } catch {
    // Django itself being down must still leave a usable address form: the
    // picker reads this and steps aside so the fields below can be typed in.
    return UNAVAILABLE("unreachable");
  }
}
