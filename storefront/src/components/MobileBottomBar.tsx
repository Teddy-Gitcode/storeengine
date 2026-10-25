"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, LayoutGrid, Percent, Heart, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/lib/cart-store";

/* These were emoji, which meant the primary mobile navigation rendered in a
   different style, weight and colour on every OS — and in flat monochrome on
   the platforms that ship no colour emoji font at all. Drawn icons inherit
   `currentColor`, so the active/inactive states below actually apply to them. */
const items = [
  { href: "/",          label: "Home",     Icon: Home },
  { href: "/shop",      label: "Shop",     Icon: LayoutGrid },
  { href: "/offers",    label: "Offers",   Icon: Percent },
  { href: "/wishlist",  label: "Wishlist", Icon: Heart },
  { href: "/cart",      label: "Cart",     Icon: ShoppingCart },
  { href: "/account",   label: "Account",  Icon: User }
];

export default function MobileBottomBar() {
  const path = usePathname();
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // On product detail pages, the contextual MobileBuyBar takes this slot instead.
  if (path.startsWith("/product/")) return null;

  return (
    // The app's bar: outline icons with labels, the current tab in the brand
    // with a short dash under it.
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-line/10 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-6">
        {items.map((i) => {
          const Icon = i.Icon;
          const active =
            i.href === "/" ? path === "/" : path === i.href || path.startsWith(i.href + "/");
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10.5px] transition-colors relative ${
                  active ? "text-brand font-extrabold" : "text-ink-muted font-semibold"
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  {...(i.href === "/wishlist" && active ? { fill: "currentColor" } : {})}
                />
                <span>{i.label}</span>
                <span
                  aria-hidden
                  className={`mt-0.5 h-[3px] rounded-full bg-brand transition-all ${active ? "w-[18px]" : "w-0"}`}
                />
                {i.href === "/cart" && mounted && count > 0 && (
                  <span className="absolute top-1 right-[calc(50%-22px)] bg-brand text-on-brand text-[9px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
