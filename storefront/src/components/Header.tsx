import Link from "next/link";
import AnnounceBar from "./AnnounceBar";
import SearchBar from "./SearchBar";
import CartBadge from "./CartBadge";
import CategoryNav from "./CategoryNav";
import ThemeToggle from "./ThemeToggle";
import CurrencySwitch from "./CurrencySwitch";
import WishlistNav from "./WishlistNav";
import { UserRound } from "lucide-react";
import { getStoreSettings } from "@/lib/settings-api";
import { getCategories } from "@/lib/catalog-api";
import { getDeals } from "@/lib/content-api";

export default async function Header() {
  // The nav used a hardcoded demo category list, so a merchant renaming or
  // adding a category never saw it here. These are the real ones (which fall
  // back to that same demo list when the API has none).
  const [settings, categories, flashDeals] = await Promise.all([
    getStoreSettings(),
    getCategories(),
    getDeals("flash"),
  ]);
  // The nav entry follows the live sale's own headline where it has one.
  const flashDealsLabel = flashDeals.length
    ? flashDeals[0].headline?.trim() || "Flash deals"
    : undefined;

  return (
    <header className="bg-surface/95 backdrop-blur border-b border-line/5 sticky top-0 z-30 shadow-[0_1px_18px_rgba(0,0,0,0.04)]">
      <AnnounceBar />
      {/* Tighter gaps below sm: at 390px the old gap-5 spent 40px of a very
          narrow row on whitespace, squeezing the search field. */}
      <div className="container-store flex items-center gap-3 sm:gap-5 py-3.5">
        <Link href="/" className="shrink-0 inline-flex items-center" aria-label={`${settings.business_name} home`}>
          {settings.logo_url ? (
            // Plain <img>: the logo is a merchant-supplied URL from any host,
            // which next/image would reject without per-domain config.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt="" className="h-9 sm:h-10 w-auto" />
          ) : (
            <span className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-brand">
              {settings.business_name}
            </span>
          )}
        </Link>
        <SearchBar categories={categories} />
        <div className="flex items-center gap-4 shrink-0 ml-auto md:ml-0">
          <CurrencySwitch />
          <ThemeToggle />
          <div className="hidden md:flex"><WishlistNav /></div>
          <Link href="/account" className="hidden md:flex flex-col items-center text-[11px] text-ink-muted hover:text-brand transition-colors">
            <UserRound size={22} strokeWidth={1.8} />
            <span>Account</span>
          </Link>
          <CartBadge />
        </div>
      </div>
      <CategoryNav categories={categories} flashDealsLabel={flashDealsLabel} />
    </header>
  );
}
