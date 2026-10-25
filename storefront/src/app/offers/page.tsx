import type { Metadata } from "next";
import { publicMediaUrl } from "@/lib/images";
import { getStoreSettings } from "@/lib/settings-api";
import { shareCard } from "@/lib/share-card";
import { CATALOG_MAX_PAGE_SIZE, getProduct, getProducts } from "@/lib/catalog-api";
import { getDeals } from "@/lib/content-api";
import ProductGrid from "@/components/ProductGrid";
import EmptyState from "@/components/ui/EmptyState";

/* A deals page is shared because of what is on offer, so the card shows the
   first product in the first live deal rather than the shop's logo. A store
   with nothing running falls back to the site's own card — there is no deal
   to picture. */
export async function generateMetadata(): Promise<Metadata> {
  const [settings, deals] = await Promise.all([getStoreSettings(), getDeals()]);
  const lead = deals.flatMap((d) => d.products)[0];
  const product = lead ? await getProduct(lead.slug) : undefined;
  const description = deals.length
    ? `Deals on now at ${settings.business_name}.`
    : `Deals at ${settings.business_name}.`;

  return {
    title: "Offers",
    description,
    ...shareCard({
      title: "Offers",
      description,
      siteName: settings.business_name,
      image: publicMediaUrl(product?.images?.[0]?.url) || undefined,
    }),
  };
}

export default async function OffersPage() {
  const [products, deals] = await Promise.all([
    getProducts({ pageSize: CATALOG_MAX_PAGE_SIZE }),
    getDeals()
  ]);
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  // Each live deal from the admin becomes its own section, so a shopper can
  // see what the offer actually is rather than one undifferentiated grid.
  const sections = deals
    .map((deal) => ({
      deal,
      products: deal.products.map((p) => bySlug.get(p.slug)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
    }))
    .filter((s) => s.products.length > 0);

  // Nothing switched on yet — fall back to what is genuinely marked down.
  // It used to include every featured product too, so a catalogue with one
  // real discount filed ten full-price products under "Offers".
  const fallback = products.filter((p) => p.priceOld && p.priceOld > p.price);

  return (
    <div className="container-store py-8">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold text-ink">Offers</h1>
        <p className="text-sm text-ink-muted mt-1">
          {sections.length
            ? "Live deals, while they last."
            : fallback.length
              ? "Everything currently marked down."
              : "No offers are running right now."}
        </p>
      </header>

      {sections.length === 0 ? (
        fallback.length ? (
          <ProductGrid products={fallback} />
        ) : (
          <EmptyState
            title="Nothing is discounted at the moment."
            description="New offers land here as soon as they go live."
            action={{ href: "/shop", label: "Browse all products" }}
          />
        )
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map(({ deal, products: dealProducts }) => (
            <section key={deal.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <div>
                  {/* The headline is what the merchant wants shoppers to read;
                      `title` only names the deal in the admin list. */}
                  <h2 className="text-[20px] font-semibold text-ink">
                    {deal.headline?.trim() || deal.title}
                  </h2>
                  {deal.subheadline?.trim() && (
                    <p className="text-sm text-ink-muted mt-0.5">{deal.subheadline}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {Number(deal.discount_percent) > 0 && (
                    <span className="text-brand font-semibold">
                      {Number(deal.discount_percent)}% off
                    </span>
                  )}
                  {deal.ends_at && (
                    <span className="text-ink-muted">
                      Ends{" "}
                      {new Date(deal.ends_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <ProductGrid products={dealProducts} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
