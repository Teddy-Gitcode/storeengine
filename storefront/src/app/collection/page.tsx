import type { Metadata } from "next";
import ProductGrid from "@/components/ProductGrid";
import { getProductsByIds } from "@/lib/catalog-api";
import { publicMediaUrl } from "@/lib/images";
import { getStoreSettings } from "@/lib/settings-api";
import { shareCard } from "@/lib/share-card";
import EmptyState from "@/components/ui/EmptyState";

/* A collection is a link someone chose to send — the ids in the URL are the
   whole point of it — so the card shows what is in it rather than the shop in
   general. Reaching it with no ids is an empty collection and gets the site's
   own card, because there is nothing to picture. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const ids = (params.ids || "")
    .split(",")
    .map(Number)
    .filter(Number.isFinite);
  const [settings, products] = await Promise.all([
    getStoreSettings(),
    getProductsByIds(ids),
  ]);
  const title = "Featured collection";
  const description = products.length
    ? `${products.length} ${products.length === 1 ? "pick" : "picks"} from ${settings.business_name}.`
    : `A collection from ${settings.business_name}.`;

  return {
    title: "Collection",
    description,
    ...shareCard({
      title,
      description,
      siteName: settings.business_name,
      image: publicMediaUrl(products[0]?.images?.[0]?.url) || undefined,
    }),
  };
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const params = await searchParams;
  const ids = (params.ids || "")
    .split(",")
    .map(Number)
    .filter(Number.isFinite);
  const products = await getProductsByIds(ids);

  return (
    <main className="container-store py-8">
      <h1 className="text-[22px] font-semibold text-ink mb-1">Featured collection</h1>
      {/* A collection is addressed by id in the URL. Reaching it with none, or
          with ids that no longer resolve, is an empty collection — not the
          "no products match your filters" the grid otherwise shows on a page
          that has no filters. */}
      {products.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="This collection is empty."
          description="The products in it may have been unpublished since the link was made."
          action={{ href: "/shop", label: "Browse all products" }}
        />
      ) : (
        <>
          <p className="text-[13.5px] text-ink-muted mb-6">
            {products.length} hand-picked product{products.length === 1 ? "" : "s"}
          </p>
          <ProductGrid products={products} />
        </>
      )}
    </main>
  );
}
