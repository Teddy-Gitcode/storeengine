"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";

export type NavCategory = { slug: string; name: string };

export default function CategoryNav({
  categories,
  flashDealsLabel,
}: {
  categories: NavCategory[];
  /** Set only while a flash sale is live — a link to an empty page is worse
      than no link, so the entry comes and goes with the sale. */
  flashDealsLabel?: string;
}) {
  const path = usePathname();
  const NAV_LIMIT = 7;
  const topLinks = [
    { slug: "home", name: "Home", href: "/" },
    ...categories.slice(0, NAV_LIMIT).map((c) => ({ slug: c.slug, name: c.name, href: `/shop/${c.slug}` })),
  ];
  // A store with more categories than fit had the rest reachable only from the
  // footer's category page, which nothing in the nav pointed at.
  const overflow = Math.max(categories.length - NAV_LIMIT, 0);

  return (
    <nav className="border-t border-line/5 overflow-x-auto no-scrollbar">
      <div className="container-store flex gap-6 whitespace-nowrap">
        {topLinks.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.slug}
              href={l.href}
              className={`py-3 text-[13px] border-b-2 transition-colors ${
                active
                  ? "text-brand border-brand font-semibold"
                  : "text-ink-muted border-transparent hover:text-brand"
              }`}
            >
              {l.name}
            </Link>
          );
        })}
        {overflow > 0 && (
          <Link
            href="/categories"
            className={`py-3 text-[13px] border-b-2 transition-colors ${
              path === "/categories"
                ? "text-brand border-brand font-semibold"
                : "text-ink-muted border-transparent hover:text-brand"
            }`}
          >
            +{overflow} more
          </Link>
        )}
        {flashDealsLabel && (
          <Link
            href="/flash-deals"
            className={`py-3 text-[13px] text-accent-dark font-semibold border-b-2 transition-colors ${
              path === "/flash-deals" ? "border-accent-dark" : "border-transparent hover:border-accent-dark"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Zap size={14} className="fill-current" aria-hidden /> {flashDealsLabel}
            </span>
          </Link>
        )}
        <Link
          href="/offers"
          className={`py-3 text-[13px] text-danger font-semibold border-b-2 transition-colors ${
            path === "/offers" ? "border-danger" : "border-transparent hover:border-danger"
          }`}
        >
          ● Offers
        </Link>
      </div>
    </nav>
  );
}
