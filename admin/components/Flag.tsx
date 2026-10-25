import { countryName, isCountryCode } from '@/lib/countries';

/* A country flag, drawn rather than typed.
 *
 * `flag-icons` supplies one SVG per territory and a `fi fi-<code>` class that
 * points a background image at it, so this renders identically on every OS —
 * which the emoji flags it replaces did not (Windows has no flag emoji font).
 * The stylesheet is imported once in globals.css.
 *
 * An unknown or missing code draws a neutral placeholder box instead of a
 * flag: an order with no shipping country still has to occupy its column, or
 * the rows either side of it jump. */
export default function Flag({
  code,
  className = '',
}: {
  code: string | null | undefined;
  className?: string;
}) {
  const upper = (code || '').trim().toUpperCase();

  if (!isCountryCode(upper)) {
    return (
      <span
        aria-hidden
        title="No shipping country"
        className={`inline-block shrink-0 rounded-[2px] bg-gray-200 dark:bg-white/15 ${className || 'h-3.5 w-[18px]'}`}
      />
    );
  }

  const name = countryName(upper);
  return (
    <span
      // `fis` is not used: these are 4x3 rectangles, which is what a flag in a
      // table column should be — square flags read as icons, not as countries.
      className={`fi fi-${upper.toLowerCase()} shrink-0 rounded-[2px] ${className || 'h-3.5 w-[18px]'}`}
      role="img"
      aria-label={name || upper}
      title={name || upper}
    />
  );
}
