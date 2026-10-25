import type { ReactNode } from "react";

/* Badges, chips and tags — the small coloured labels.
 *
 * The storefront had a red one for a discount, an amber one for "featured", a
 * brand one for a category, an outlined one for a suggestion and a white
 * backdrop-blurred one on a photo, each written inline wherever it was needed,
 * each with its own size. Same five tones, one component. */

export type PillTone = "danger" | "accent" | "brand" | "neutral" | "outline" | "overlay";

const tones: Record<PillTone, string> = {
  /** A markdown, a countdown, anything urgent. */
  // Markdowns wear the brand in Shoppe, not a separate red.
  danger: "bg-brand text-on-brand",
  /** Featured, bestseller — the shop's own emphasis. */
  accent: "bg-accent text-accent-dark",
  brand: "bg-brand text-on-brand",
  neutral: "bg-blob text-ink",
  /** Tappable: a suggestion or a filter. */
  outline: "bg-surface text-ink border border-line/20 hover:border-brand/50 transition-colors",
  /** Sits on top of a photo. */
  overlay: "bg-surface/85 text-ink backdrop-blur border border-line/10",
};

export default function Pill({
  tone = "neutral",
  size = "sm",
  className = "",
  children,
}: {
  tone?: PillTone;
  /** `xs` for a corner badge on an image, `sm` for everything else. */
  size?: "xs" | "sm";
  className?: string;
  children: ReactNode;
}) {
  const dims =
    size === "xs"
      ? "px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      : "px-3 py-1 text-[12px] font-semibold";
  return (
    <span className={`inline-flex items-center rounded-full ${tones[tone]} ${dims} ${className}`}>
      {children}
    </span>
  );
}
