"use client";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/* A section you can fold away: specifications, what's in the box, delivery.
 *
 * A product page carries more than anyone reads in one go, and on a phone a
 * flat stack of every section means scrolling past all of it to reach the
 * reviews. Folded sections let the page state what it has without spending the
 * screen on it.
 *
 * Uses a real button and aria-expanded rather than <details>, so the chevron
 * animates and the styling matches the rest of the kit. */
export default function Accordion({
  title,
  children,
  defaultOpen = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={`border-b border-line/15 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
      >
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <ChevronDown
          size={18}
          aria-hidden
          className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div id={panelId} hidden={!open} className="pb-4">
        {children}
      </div>
    </div>
  );
}
