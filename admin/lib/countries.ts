/**
 * ISO 3166-1 alpha-2 → display name.
 *
 * The flag used to be derived from the code itself, by mapping each letter to
 * its regional indicator symbol so the pair rendered as an emoji flag. Elegant,
 * and broken for a large share of this admin's users: Windows ships no flag
 * emoji at all, so every one of them rendered as two bare letters in a box —
 * and the panels below are exactly where an operator scans a column of orders
 * for the one going somewhere unusual. Flags are drawn now (see `Flag`), from
 * the SVG set in `flag-icons`.
 */

/** Full country name for a code, falling back to the code itself. */
export function countryName(code: string | null | undefined, locale = 'en'): string {
  const upper = (code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(upper) ?? upper;
  } catch {
    // Older runtimes without Intl.DisplayNames — the code still reads fine.
    return upper;
  }
}

/** Whether a value is a usable alpha-2 code, i.e. whether `Flag` will draw. */
export function isCountryCode(code: string | null | undefined): boolean {
  return /^[A-Z]{2}$/.test((code || '').trim().toUpperCase());
}
