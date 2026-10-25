import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { publicMediaUrl } from "@/lib/images";
import { getStoreSettings } from "@/lib/settings-api";
import { shareCard } from "@/lib/share-card";
import { getProductsPage, getCategories } from "@/lib/catalog-api";
import ShopBrowser from "@/components/ShopBrowser";

/* This page resolved the slug against the static demo list, which meant the
   only categories that worked were the six fake ones. Every real category —
   and so every category tile, nav link and breadcrumb on the site — rendered
   "Category not found", while /shop/apparel happily rendered a page with zero
   products. Resolution now goes through the API. */

// getCategories() already substitutes the demo list when the API returns none,
// so there is no second fallback to add here — and adding one was wrong: it
// meant a store with a real catalogue still served /shop/apparel from the
// template's fixtures.
async function resolveCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug);
}

/* Rendered per request, never prerendered.

   Prices are converted for the shopper — shillings at home, dollars abroad —
   so one cached copy of this page would hand whichever currency it was built
   with to everyone who asked for it afterwards. A product page that quotes the
   wrong currency is worse than one that takes a moment longer.

   It also has to be dynamic to be renderable at all: the root layout reads the
   country cookie, and a statically generated route cannot read a cookie —
   which is exactly how this page started answering 500 in production while
   working perfectly in development.
*/
export const dynamic = "force-dynamic";

/* A category has no picture of its own — `tile` is a colour, not an image —
   so the card borrows the first product in it. That is the honest
   representative: it is what the page opens with. */
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = await resolveCategory(category);
  if (!c) return { title: "Category not found" };

  const [settings, { products, total }] = await Promise.all([
    getStoreSettings(),
    getProductsPage({ category, pageSize: 1 }),
  ]);
  const description = total
    ? `${total} ${total === 1 ? "product" : "products"} in ${c.name} at ${settings.business_name}.`
    : `${c.name} at ${settings.business_name}.`;

  return {
    title: c.name,
    description,
    ...shareCard({
      title: c.name,
      description,
      siteName: settings.business_name,
      image: publicMediaUrl(products[0]?.images?.[0]?.url) || undefined,
    }),
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [c, { products, hasMore, total }, categories] = await Promise.all([
    resolveCategory(category),
    getProductsPage({ category }),
    getCategories()
  ]);
  if (!c) notFound();

  return (
    <div className="container-store py-5">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-muted mb-3">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/shop" className="hover:text-brand">Shop</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{c.name}</span>
      </nav>

      <ShopBrowser
        products={products}
        hasMore={hasMore}
        total={total}
        query={{ category }}
        title={c.name}
        categories={categories}
        showCategoryFilter={false}
      />
    </div>
  );
}
