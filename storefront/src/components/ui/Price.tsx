"use client";
import { money, priceParts } from "@/lib/format";

/* A price, set the way shops set them: the symbol small and raised, the number
 * large, the cents raised beside it — and the price it used to be struck
 * through next to it.
 *
 * Four places rendered "current price, old price struck" with four different
 * type sizes. The was-price is not decoration: it only ever renders when the
 * catalogue actually carries one. */

const sizes = {
  lg: { big: "text-[30px]", small: "text-[14px] top-[3px]", was: "text-[13px]" },
  md: { big: "text-[22px]", small: "text-[11px] top-[2px]", was: "text-[12px]" },
  sm: { big: "text-[16px]", small: "text-[10px] top-[1px]", was: "text-[11px]" },
} as const;

export default function Price({
  amount,
  compareAt,
  size = "lg",
  className = "",
}: {
  amount: number;
  /** What it used to cost. Ignored unless it is genuinely higher. */
  compareAt?: number | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const { symbol, whole, fraction } = priceParts(amount);
  const s = sizes[size];
  const was = compareAt && compareAt > amount ? compareAt : null;

  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="inline-flex items-start font-display text-ink tabular-nums">
        <span className={`relative ${s.small} font-medium`}>{symbol}</span>
        <span className={`${s.big} font-extrabold leading-none tracking-tight`}>{whole}</span>
        {fraction && <span className={`relative ${s.small} font-medium`}>{fraction}</span>}
      </span>
      {was && (
        <span className={`${s.was} text-ink-faint line-through tabular-nums`}>{money(was)}</span>
      )}
    </span>
  );
}
