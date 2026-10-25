import Link from "next/link";
import { ChevronRight } from "lucide-react";

/* Home › Shop › Category › This product.
 *
 * Written out twice, on the product page and the category page, with different
 * separators and different truncation. The last crumb is the current page, so
 * it is text rather than a link. */
export default function Breadcrumb({
  trail,
  className = "",
}: {
  /** In order. The last entry is the page you are on; give it no href. */
  trail: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-y-1 text-[12.5px] text-ink-muted ${className}`}
    >
      {trail.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="flex items-center">
          {i > 0 && <ChevronRight size={12} className="mx-1 text-ink-faint" aria-hidden />}
          {crumb.href ? (
            <Link href={crumb.href} className="transition-colors hover:text-brand">
              {crumb.label}
            </Link>
          ) : (
            <span className="max-w-[220px] truncate text-ink sm:max-w-none">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
