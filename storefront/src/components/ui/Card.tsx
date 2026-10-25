import type { ElementType, ReactNode } from "react";

/* The surface every panel on the storefront is made of.
 *
 * There were about a hundred and thirty hand-rolled versions of this: four
 * radii (lg, xl, 2xl, md), five border opacities (line/5, /10, /15, /20 and
 * bare line) and six paddings, chosen per file by whoever added the feature.
 * Nothing distinguished them — they are all "a bordered panel on the page" —
 * so the variation was noise a shopper reads as sloppiness.
 *
 * Three tones, four paddings. If a panel needs something outside this, it is
 * probably not a panel. */

export type CardTone = "surface" | "alt" | "dashed" | "quiet";
export type CardPadding = "none" | "sm" | "md" | "lg";

const tones: Record<CardTone, string> = {
  /** The default: a panel that sits on the page background. */
  surface: "bg-surface shadow-card border border-line/5 dark:border-line/10",
  /** Slightly recessed — for a panel inside another panel. Shoppe's flat grey. */
  alt: "bg-surface-alt border border-transparent dark:border-line/10",
  /** Nothing here yet: empty states and drop targets. */
  dashed: "bg-surface border border-dashed border-line/20",
  /** Informational aside — no competition with real content. */
  quiet: "bg-surface-alt border border-transparent",
};

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-6 sm:p-8",
};

export default function Card({
  as: Tag = "div",
  tone = "surface",
  padding = "md",
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  tone?: CardTone;
  padding?: CardPadding;
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>) {
  return (
    <Tag className={`rounded-xl ${tones[tone]} ${paddings[padding]} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
