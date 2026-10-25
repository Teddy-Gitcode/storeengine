import type { ReactNode } from "react";
import SectionHeader from "./SectionHeader";

/* A row of things you scroll sideways: recommendations, deals, categories.
 *
 * Three shelves existed and no two scrolled the same way — one was a grid that
 * simply cut off at four items, one had `-mx-4 px-4` bleed and no snapping, one
 * snapped but hid its overflow. On a phone that is the difference between a row
 * you can flick through and a row whose fifth item nobody ever sees.
 *
 * Items are sized by the caller (a shelf of category circles is not a shelf of
 * product cards); the scrolling, the bleed to the screen edge and the snap
 * belong here. */
export default function Shelf({
  title,
  action,
  children,
  className = "",
  ariaLabel,
}: {
  title?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <section className={className} aria-label={ariaLabel ?? title}>
      {title && <SectionHeader title={title} action={action} />}
      {/* The negative margin lets the row bleed to the screen edge on a phone,
          so a half-visible card signals "there is more this way". */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {children}
      </div>
    </section>
  );
}
