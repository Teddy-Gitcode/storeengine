import { NextResponse, type NextRequest } from "next/server";

/* Where the shopper appears to be, taken from the CDN and left in a cookie.
 *
 * This is the edge signal behind the delivery-country preselect in
 * src/lib/guess-country.ts. It is a hint and nothing more: a saved address
 * always outranks it, and the country field stays an editable dropdown.
 *
 * ── Which header, and why not Cloudflare's ──────────────────────────────────
 *
 * `CF-IPCountry` is the famous one and it is useless here. Cloudflare fronts
 * `api.teddylan.com` (orange cloud) but `tedstore.teddylan.com` is DNS-only —
 * it resolves straight to Vercel, so Cloudflare never sees a storefront
 * request and adds no header to one. See docs/cloudflare-rules.md, which
 * measured exactly this blind spot for the rate-limiting rules.
 *
 * Vercel fronts the storefront, so `x-vercel-ip-country` is the header that
 * actually arrives. Cloudflare's is read as a fallback anyway: it costs one
 * lookup, and it means this keeps working if the storefront is ever moved
 * behind the orange cloud, or served through the staging Caddy instead.
 *
 * Neither header exists in local development, which is the normal case and not
 * an error — the timezone guess covers it.
 *
 * ── Why a cookie ────────────────────────────────────────────────────────────
 *
 * /checkout is a client component, so it cannot read request headers, and it
 * prerenders as static, so making it read them would cost that. A cookie
 * crosses both boundaries: middleware sets it from the edge, the client reads
 * it with document.cookie, and the page stays static.
 *
 * It is only written when the value actually changes. A `Set-Cookie` on every
 * response tells a CDN not to cache that response, and a preselect hint is not
 * worth paying for cache misses.
 *
 * ── What is stored ──────────────────────────────────────────────────────────
 *
 * A two-letter country code, and never the IP address it was derived from.
 * The CDN resolves the address at its own edge and we keep only the answer,
 * which is what keeps this the boring kind of personal data.
 */

const COOKIE = "shopper_country";
const ONE_DAY = 60 * 60 * 24;

/* Codes that mean "we could not tell". Cloudflare sends XX for unknown and T1
   for Tor; treating either as a country would preselect a place that does not
   exist and look like a bug rather than a guess. */
const NOT_A_COUNTRY = new Set(["XX", "T1", "X1"]);

function edgeCountry(request: NextRequest): string | null {
  const raw =
    request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? "";
  const code = raw.trim().toUpperCase();
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return null;
  return NOT_A_COUNTRY.has(code) ? null : code;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const country = edgeCountry(request);

  if (country && request.cookies.get(COOKIE)?.value !== country) {
    response.cookies.set(COOKIE, country, {
      // Read by client code, so deliberately not httpOnly. It carries a country
      // code and nothing else; there is nothing here to steal.
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_DAY,
    });
  }

  return response;
}

export const config = {
  /* Only the two places a delivery country is chosen. Running everywhere would
     put a Set-Cookie on cacheable marketing pages for no gain. */
  matcher: ["/checkout", "/account/:path*"],
};
