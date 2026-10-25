/* Countries, their subdivisions, and what a postcode looks like in each.
 *
 * The address book used to offer fourteen destinations, hand-listed. Anyone
 * living anywhere else simply could not save an address — not "was warned",
 * could not, because their country was not in the dropdown. That is a closed
 * door on the 44% of revenue that comes from outside Kenya, and it is the
 * reason this file exists.
 *
 * Names come from Intl.DisplayNames rather than a table, the same way
 * apps/admin/lib/countries.ts already does it: it is translated, it is
 * maintained by the runtime rather than by us, and a table of 253 names is a
 * table that goes stale. The codes themselves are pinned here because nothing
 * in the platform enumerates them.
 */

/** ISO 3166-1 alpha-2, every code the flag set ships art for, minus the four
 *  that are not countries (EU, UN, PC, XX). Kosovo (XK) is included: it is
 *  user-assigned rather than official, and leaving it out is exactly the kind
 *  of omission that makes an address form unusable for the person it excludes. */
export const COUNTRY_CODES: string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT",
  "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI",
  "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY",
  "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CP", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DG", "DJ",
  "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI",
  "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH",
  "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU", "IC", "ID", "IE", "IL", "IM", "IN",
  "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI",
  "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF",
  "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT",
  "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI",
  "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH",
  "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO",
  "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ",
  "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR",
  "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC",
  "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM",
  "ZW",];

const CODE_SET = new Set(COUNTRY_CODES);

/** Names Intl declines to give, or gives worse than we can. */
const NAME_OVERRIDES: Record<string, string> = {
  // Correct in most runtimes, but old ICU builds return the bare code.
  XK: "Kosovo",
};

/** Full country name for a code, falling back to the code itself. */
export function countryName(code: string | null | undefined, locale = "en"): string {
  const upper = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  if (NAME_OVERRIDES[upper]) return NAME_OVERRIDES[upper];
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(upper) ?? upper;
  } catch {
    // A runtime without Intl.DisplayNames. The code still reads as something.
    return upper;
  }
}

/**
 * The country a new address should start on: whatever StoreSettings.country
 * says, matched by name or by code. Falls back to Kenya rather than to a
 * country the merchant never mentioned.
 */
export function storeCountryCode(storeCountry: string): string {
  const wanted = (storeCountry || "").trim().toLowerCase();
  if (!wanted) return "KE";
  const upper = wanted.toUpperCase();
  if (CODE_SET.has(upper)) return upper;
  const byName = COUNTRY_CODES.find((c) => countryName(c).toLowerCase() === wanted);
  return byName ?? "KE";
}

/** Sorted so the store's country leads — most orders are domestic, and
 *  scrolling past 252 others to reach it is a tax on the common case. The
 *  rest are alphabetical by the name actually shown, not by code. */
export function countryOptions(storeCountry: string): { code: string; name: string }[] {
  const home = storeCountryCode(storeCountry);
  const rest = COUNTRY_CODES.filter((c) => c !== home)
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [{ code: home, name: countryName(home) }, ...rest];
}

/* ── What the line above the postcode is called ─────────────────────────────
 *
 * A generic "County / Region" under a country selector reads as a second
 * question about the country, and was answered that way — a saved address
 * exists with "united states" in it. */
const REGION_LABELS: Record<string, string> = {
  US: "State", AU: "State", IN: "State", BR: "State", MX: "State", NG: "State",
  MY: "State", DE: "State", AT: "State",
  CA: "Province", ZA: "Province", RW: "Province", CN: "Province", PH: "Province",
  NL: "Province", BE: "Province", ID: "Province", TR: "Province",
  GB: "County", KE: "County", IE: "County",
  UG: "District", NP: "District",
  AE: "Emirate",
  JP: "Prefecture",
  FR: "Region", TZ: "Region", IT: "Region", NO: "Region", GH: "Region",
  ES: "Province", CH: "Canton", RU: "Oblast", SA: "Region", EG: "Governorate",
};

export function regionLabel(countryCode: string): string {
  return REGION_LABELS[(countryCode || "").toUpperCase()] ?? "County / Region";
}

/* ── Subdivisions, where the list is fixed and short enough to pick from ────
 *
 * Only countries whose divisions are a settled, closed set. Everywhere else
 * gets a free text box, because a half-remembered list is worse than none: a
 * dropdown missing someone's region cannot be worked around, while a text box
 * always can. Adding a country here is additive and safe. */
export const SUBDIVISIONS: Record<string, { code: string; name: string }[]> = {
  US: [
    ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
    ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],
    ["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],
    ["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],
    ["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],
    ["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],
    ["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],
    ["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],
    ["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],
    ["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],
    ["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
    ["PR","Puerto Rico"],["VI","U.S. Virgin Islands"],["GU","Guam"],["AS","American Samoa"],
    ["MP","Northern Mariana Islands"],
  ].map(([code, name]) => ({ code, name })),
  CA: [
    ["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],
    ["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],
    ["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],
    ["SK","Saskatchewan"],["YT","Yukon"],
  ].map(([code, name]) => ({ code, name })),
  AU: [
    ["ACT","Australian Capital Territory"],["NSW","New South Wales"],["NT","Northern Territory"],
    ["QLD","Queensland"],["SA","South Australia"],["TAS","Tasmania"],["VIC","Victoria"],
    ["WA","Western Australia"],
  ].map(([code, name]) => ({ code, name })),
  // The home market. 47 counties, fixed by the 2010 constitution.
  KE: [
    "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo",
    "Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui",
    "Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori",
    "Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri",
    "Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana",
    "Uasin Gishu","Vihiga","Wajir","West Pokot",
  ].map((name) => ({ code: name, name })),
};

/** The fixed list for a country, or null when it should stay a text box. */
export function subdivisions(countryCode: string): { code: string; name: string }[] | null {
  return SUBDIVISIONS[(countryCode || "").toUpperCase()] ?? null;
}

/* ── Postcodes ──────────────────────────────────────────────────────────────
 *
 * Both address forms used to set inputMode="numeric" on this field for every
 * country on earth. On a phone that is a number pad, and a number pad cannot
 * type "SW1A 1AA", "K1A 0B1" or "1012 AB" — so a shopper in the UK, Canada or
 * the Netherlands was handed a keyboard that could not spell their own
 * postcode. That is the bug; everything here exists to make the field fit the
 * country rather than assume Kenya's five digits.
 *
 * `pattern` is only set where the format is a settled national standard we can
 * state exactly. Everywhere else the field takes whatever is typed: a postcode
 * we cannot validate is not a postcode we should reject, and this field stays
 * optional in every country regardless. Rejecting a valid address is a lost
 * order; accepting an odd-looking one costs nothing a courier cannot handle.
 */
export type PostcodeRule = {
  /** A number pad is right only where the format is digits and nothing else. */
  numeric: boolean;
  /** Shown as the placeholder, so the shape is obvious before a mistake. */
  example?: string;
  /** Checked on save. Absent means "accept anything". */
  pattern?: RegExp;
};

const POSTCODE_RULES: Record<string, PostcodeRule> = {
  KE: { numeric: true, example: "00100", pattern: /^\d{5}$/ },
  US: { numeric: true, example: "12345 or 12345-6789", pattern: /^\d{5}(-\d{4})?$/ },
  GB: { numeric: false, example: "SW1A 1AA", pattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/ },
  CA: { numeric: false, example: "K1A 0B1", pattern: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/ },
  NL: { numeric: false, example: "1012 AB", pattern: /^\d{4}\s?[A-Za-z]{2}$/ },
  AU: { numeric: true, example: "2000", pattern: /^\d{4}$/ },
  ZA: { numeric: true, example: "0001", pattern: /^\d{4}$/ },
  DE: { numeric: true, example: "10115", pattern: /^\d{5}$/ },
  FR: { numeric: true, example: "75001", pattern: /^\d{5}$/ },
  ES: { numeric: true, example: "28001", pattern: /^\d{5}$/ },
  IT: { numeric: true, example: "00100", pattern: /^\d{5}$/ },
  IN: { numeric: true, example: "110001", pattern: /^\d{6}$/ },
  NG: { numeric: true, example: "100001", pattern: /^\d{6}$/ },
  BR: { numeric: false, example: "01310-100", pattern: /^\d{5}-?\d{3}$/ },
  JP: { numeric: false, example: "100-0001", pattern: /^\d{3}-?\d{4}$/ },
};

/** Unknown countries get a plain text box that accepts anything — the safe
 *  default, and the one most of the world needs. */
export function postcodeRule(countryCode: string): PostcodeRule {
  return POSTCODE_RULES[(countryCode || "").toUpperCase()] ?? { numeric: false };
}

/**
 * An error message, or null when the value is acceptable.
 *
 * Blank is always acceptable: the field is optional everywhere, and plenty of
 * countries either have no postal codes at all or do not use them for
 * delivery. Only a value that is present *and* contradicts a format we are
 * certain of is refused.
 */
export function validatePostcode(countryCode: string, value: string): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  const rule = postcodeRule(countryCode);
  if (!rule.pattern || rule.pattern.test(trimmed)) return null;
  const name = countryName(countryCode) || "this country";
  return rule.example
    ? `That doesn't look like a ${name} postcode — they look like ${rule.example}.`
    : `That doesn't look like a ${name} postcode.`;
}
