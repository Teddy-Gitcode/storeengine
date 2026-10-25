/* A guess at where the shopper is, for preselecting the delivery country.
 *
 * A guess, and treated as one everywhere it is used: it only ever fills a
 * field nobody has touched, the field stays a visible dropdown, and a saved
 * address always outranks it. Getting this wrong and leaving it editable costs
 * a shopper one click; getting it wrong and acting like it is a fact costs an
 * order.
 *
 * The signal is the browser's own timezone, not the IP address. It needs no
 * network call, no third-party service and no IP to be sent anywhere, it works
 * in local development and in previews where there is no CDN in front, and it
 * is right more often than a locale is — someone in Nairobi running an en-US
 * phone still has Africa/Nairobi.
 *
 * What it is *not* is a substitute for asking. A Kenyan in Manchester ordering
 * tea for their mother in Nairobi has a British timezone and a Kenyan delivery
 * address, and only the address is true. That case is exactly why the signal
 * ranks below a saved address and never locks the field.
 */

/* Zones for the destinations the address book offers, and no others: a guess
   we cannot offer as an option is not worth carrying. Countries that span many
   zones list the populous ones rather than every entry in the database — an
   unlisted zone falls through to the next signal, which is the correct
   outcome for a guess that does not know. */
const TIMEZONE_COUNTRY: Record<string, string> = {
  // Single-zone destinations.
  "Africa/Nairobi": "KE",
  "Africa/Kampala": "UG",
  "Africa/Dar_es_Salaam": "TZ",
  "Africa/Kigali": "RW",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Asia/Dubai": "AE",
  "Europe/London": "GB",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Busingen": "DE",
  "Asia/Kolkata": "IN",
  // Still emitted by older browsers and some Linux builds.
  "Asia/Calcutta": "IN",

  // United States.
  "America/New_York": "US",
  "America/Detroit": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Phoenix": "US",
  "America/Los_Angeles": "US",
  "America/Anchorage": "US",
  "America/Boise": "US",
  "America/Juneau": "US",
  "America/Indiana/Indianapolis": "US",
  "America/Kentucky/Louisville": "US",
  "Pacific/Honolulu": "US",

  // Canada.
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/St_Johns": "CA",
  "America/Regina": "CA",
  "America/Moncton": "CA",
  "America/Whitehorse": "CA",

  // Australia.
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Australia/Hobart": "AU",
  "Australia/Darwin": "AU",
  "Australia/Canberra": "AU",
};

/** Whole-country prefixes, for zones the table above does not name. */
const TIMEZONE_PREFIX_COUNTRY: [string, string][] = [
  ["Australia/", "AU"],
  // America/ is deliberately absent: it covers the United States, Canada and
  // most of Latin America, so a prefix match there would be a coin toss.
];

/**
 * What the CDN said, via the cookie src/middleware.ts leaves behind.
 *
 * Better than the timezone when it is present: it is derived from the address
 * the request actually arrived from, rather than from a clock setting. Absent
 * in local development and anywhere without a CDN in front, which is ordinary
 * and not an error.
 *
 * Still only a hint. The shopper's own saved address outranks it, for the same
 * reason it outranks everything else — a Kenyan in Manchester has a British
 * IP and a Kenyan delivery address, and only one of those is a decision they
 * made.
 */
export function edgeCountry(supported: string[]): string | null {
  let raw = "";
  try {
    raw =
      document.cookie
        .split("; ")
        .find((entry) => entry.startsWith("shopper_country="))
        ?.split("=")[1] ?? "";
  } catch {
    // No document (server render) or cookies blocked. Neither is worth an error.
    return null;
  }

  const code = decodeURIComponent(raw).trim().toUpperCase();
  // Validated again here rather than trusted: a cookie is client-writable, and
  // this value picks a country, so it must be one the store actually ships to.
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return supported.includes(code) ? code : null;
}

/**
 * The shopper's likely country as an ISO code, or null when there is no
 * usable answer — which the caller must treat as "ask", not as a default.
 *
 * `supported` is the list of countries the store actually ships to. A guess
 * outside it is discarded rather than coerced: offering to deliver somewhere
 * the store does not serve is worse than offering nothing.
 */
export function guessCountry(supported: string[]): string | null {
  const allowed = new Set(supported);

  // Intl is present in every browser this app supports, but this runs during
  // render in a component that also renders on the server, and a hostile or
  // exotic runtime returning nonsense should not take the checkout down.
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return null;
  }
  if (!zone) return null;

  const exact = TIMEZONE_COUNTRY[zone];
  if (exact && allowed.has(exact)) return exact;

  for (const [prefix, code] of TIMEZONE_PREFIX_COUNTRY) {
    if (zone.startsWith(prefix) && allowed.has(code)) return code;
  }

  return null;
}
