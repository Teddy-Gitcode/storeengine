import { Star } from "lucide-react";

/* A rating, drawn once for the whole storefront.
 *
 * There were two of these: glyphs with a clipped overlay on the product page,
 * lucide stars rounded to the nearest whole one in the reviews block — so 4.4
 * and 4.6 drew identically in one place and differently in the other, on the
 * same screen. This is the honest version: five outlines with the filled row
 * clipped to the exact average, which is what a fractional rating means.
 *
 * A server component: a rating never changes after render. */
export default function Stars({
  value,
  size = 14,
  className = "",
}: {
  value: number;
  /** Pixel size of one star. */
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (filled: boolean) => (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          aria-hidden
          className={filled ? "fill-current" : "opacity-25"}
        />
      ))}
    </span>
  );

  return (
    <span
      className={`relative inline-flex text-accent ${className}`}
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {row(false)}
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${pct}%` }}
        aria-hidden
      >
        {row(true)}
      </span>
    </span>
  );
}
