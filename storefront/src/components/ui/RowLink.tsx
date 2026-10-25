import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/* A full-width bordered row that leads somewhere: "See more reviews",
   "Write a review", "Track this order".
 *
 * Big shops use these instead of a small text link at the end of a long
 * section, because after scrolling through fifty reviews on a phone the next
 * step should be a target you cannot miss. */
export default function RowLink({
  href,
  onClick,
  children,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const shape =
    "flex w-full items-center justify-between gap-3 rounded-full border border-line/25 bg-surface px-5 py-3 text-[13.5px] font-medium text-ink transition-colors hover:border-brand/50 hover:text-brand";
  const body = (
    <>
      <span>{children}</span>
      <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
    </>
  );
  return href ? (
    <Link href={href} className={`${shape} ${className}`}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={`${shape} ${className}`}>
      {body}
    </button>
  );
}
