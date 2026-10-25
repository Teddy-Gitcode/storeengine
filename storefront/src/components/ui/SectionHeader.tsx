import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* "Customers also bought" and its "see all →".
 *
 * Every shelf and section on the storefront wrote this row itself, so the
 * heading was 15px here and 16px there, and the action was an arrow on one page
 * and a chevron on the next. */
export default function SectionHeader({
  title,
  action,
  className = "",
  size = "md",
}: {
  title: string;
  action?: { href: string; label: string };
  className?: string;
  /** `sm` for a header inside a card, `md` for a page section. */
  size?: "sm" | "md";
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2
        className={`font-display font-extrabold text-ink ${size === "sm" ? "text-[16px]" : "text-[20px] sm:text-[22px]"}`}
      >
        {title}
      </h2>
      {/* Shoppe's "See All" with the brand circle and its arrow. */}
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-2 text-[14px] font-bold text-ink transition-colors hover:text-brand"
        >
          {action.label}
          <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-brand text-on-brand transition-transform group-hover:translate-x-0.5">
            <ArrowRight size={16} aria-hidden />
          </span>
        </Link>
      )}
    </div>
  );
}
