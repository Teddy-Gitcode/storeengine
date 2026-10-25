import FlashSaleRow from "@/components/FlashSaleRow";
import EmptyState from "@/components/ui/EmptyState";
import type { Metadata } from "next";
import { publicMediaUrl } from "@/lib/images";
import { getStoreSettings } from "@/lib/settings-api";
import { shareCard } from "@/lib/share-card";
import { CATALOG_MAX_PAGE_SIZE, getProduct, getProducts } from "@/lib/catalog-api";
import { dealLook, getDeals } from "@/lib/content-api";

/* A deals page is shared because of what is on offer, so the card shows the
   first product in the first live deal rather than the shop's logo. A store
   with nothing running falls back to the site's own card — there is no deal
   to picture. */
export async function generateMetadata(): Promise<Metadata> {
  const [settings, deals] = await Promise.all([getStoreSettings(), getDeals("flash")]);
  const lead = deals.flatMap((d) => d.products)[0];
  const product = lead ? await getProduct(lead.slug) : undefined;
  const description = deals.length
    ? `Flash deals on now at ${settings.business_name}.`
    : `Flash deals at ${settings.business_name}.`;

  return {
    title: "Flash deals",
    description,
    ...shareCard({
      title: "Flash deals",
      description,
      siteName: settings.business_name,
      image: publicMediaUrl(product?.images?.[0]?.url) || undefined,
    }),
  };
}

export default async function FlashDealsPage() {
  const [products, deals] = await Promise.all([
    getProducts({ pageSize: CATALOG_MAX_PAGE_SIZE }),
    getDeals("flash")
  ]);
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  // One shelf per live flash sale, each with its own copy and colours, and in
  // the order the merchant arranged its products.
  const shelves = deals
    .map((deal) => ({
      deal,
      look: dealLook(deal),
      products: deal.products
        .map((p) => bySlug.get(p.slug))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .slice(0, 8),
    }))
    .filter((shelf) => shelf.products.length > 0);

  return (
    <div className="container-store py-8">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold text-ink">Flash deals</h1>
        <p className="text-sm text-ink-muted mt-1">
          {shelves.length ? "Live right now — they end when the clock does." : "Nothing running at the moment."}
        </p>
      </header>

      {shelves.length === 0 ? (
        <EmptyState
          title="No flash sale is running right now."
          description="Check back soon, or browse everything currently on offer."
          action={{ href: "/offers", label: "See all offers" }}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {shelves.map(({ deal, look, products: dealProducts }) => (
            <FlashSaleRow key={deal.id} products={dealProducts} endsAt={deal.ends_at} look={look} />
          ))}
        </div>
      )}
    </div>
  );
}
