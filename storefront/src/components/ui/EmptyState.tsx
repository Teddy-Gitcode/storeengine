import Link from "next/link";
import type { ReactNode } from "react";
import Card from "./Card";

/* "Nothing here yet" — said the same way everywhere.
 *
 * The wishlist, the order list, the review list, the tracking page and three
 * account panels each had their own: dashed or solid, py-16 or p-8, some with
 * an icon in a circle, some with a link, one with nothing but grey text. */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Where the way out leads. `onClick` for one that opens something in place
      (an address modal, a filter reset) rather than navigating. */
  action?: { label: string; href?: string; onClick?: () => void; icon?: ReactNode };
  /* A link may carry an onClick too — signing out on the way back to the
     store, say — so both are passed through rather than being alternatives. */
  className?: string;
}) {
  const actionClass =
    "mt-4 inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-on-brand transition-colors hover:bg-brand-dark";
  return (
    <Card tone="dashed" padding="lg" className={`text-center ${className}`}>
      {icon && (
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface-alt text-ink-muted">
          {icon}
        </div>
      )}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {description && (
        <div className="mx-auto mt-1 max-w-sm text-[13px] text-ink-muted">{description}</div>
      )}
      {action?.href ? (
        <Link href={action.href} onClick={action.onClick} className={actionClass}>
          {action.icon}
          {action.label}
        </Link>
      ) : action ? (
        <button type="button" onClick={action.onClick} className={actionClass}>
          {action.icon}
          {action.label}
        </button>
      ) : null}
    </Card>
  );
}
