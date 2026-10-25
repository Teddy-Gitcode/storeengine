import HeroShelf from "@/components/HeroShelf";
import QuickPicks from "@/components/QuickPicks";
import CategoryBanners from "@/components/CategoryBanners";
import ProductGrid from "@/components/ProductGrid";
import TrustStrip from "@/components/TrustStrip";
import CampaignStrip from "@/components/CampaignStrip";
import { getProducts } from "@/lib/catalog-api";
import { getActiveCampaigns } from "@/lib/content-api";
import { getStoreSettings } from "@/lib/settings-api";
import type { Product } from "@/lib/types";
import SectionHeader from "@/components/ui/SectionHeader";

export default async function HomePage() {
  // Flash deals have their own page now, reached from the top nav — see
  // /flash-deals. The homepage keeps the evergreen shelves.
  const [settings, products, campaigns] = await Promise.all([
    getStoreSettings(),
    getProducts(),
    getActiveCampaigns(),
  ]);

  /* `sold` is real units shipped, so a store that has sold nothing yet ranks
     every product at zero and the sort is a no-op — the shelf was presenting
     the first twelve products as what the store sells most, a claim about the
     merchant's business invented by a sort that did nothing. It only calls
     itself that when there is sales data to rank. Otherwise it takes one product from each
     category, which claims nothing and is a different question from the row
     of featured products above and from the newest below. */
  const hasSalesData = products.some((p) => p.sold > 0);
  const lead = hasSalesData
    ? { title: "Bestsellers", products: [...products].sort((a, b) => b.sold - a.sold).slice(0, 12) }
    : { title: "Across the range", products: onePerCategory(products).slice(0, 12) };
  const newArrivals = [...products].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 12);
  const shown = new Set([...lead.products, ...newArrivals].map((p) => p.id));
  const justForYou = products.filter((p) => !shown.has(p.id)).slice(0, 20);

  return (
    <div className="container-store py-3">
      {/* The page's only h1. The hero's slide titles are h2s that change every
          few seconds, so neither they nor the section headings can be it. */}
      <h1 className="sr-only">
        {settings.business_name}
        {settings.tagline ? ` — ${settings.tagline}` : ""}
      </h1>

      <HeroShelf />

      <CampaignStrip campaigns={campaigns} />

      <div className="py-4">
        <QuickPicks />
      </div>

      <CategoryBanners />

      <Shelf title={lead.title} href="/shop" products={lead.products} />
      <Shelf title="New Items" href="/shop" products={newArrivals} />

      {/* Shoppe's closing grid: everything else, to keep scrolling through. */}
      <Shelf title="Just For You" href="/shop" products={justForYou} star />

      <TrustStrip />
    </div>
  );
}

/** The first product of each category, in the order the categories appear. */
function onePerCategory(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    if (seen.has(p.category)) return false;
    seen.add(p.category);
    return true;
  });
}

function Shelf({
  title,
  href,
  products,
  star = false,
}: {
  title: string;
  href: string;
  products: Product[];
  star?: boolean;
}) {
  // An empty shelf is a heading, a rule and a band of nothing — worse than the
  // section simply not being there.
  if (!products.length) return null;

  return (
    <section className="mt-10">
      <SectionHeader
        title={star ? `${title} ★` : title}
        action={star ? undefined : { href, label: "See All" }}
        className="mb-4"
      />
      <ProductGrid products={products} />
    </section>
  );
}
