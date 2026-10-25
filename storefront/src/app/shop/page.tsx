import { getProductsPage, getCategories } from "@/lib/catalog-api";
import ShopBrowser from "@/components/ShopBrowser";

export const metadata = { title: "Shop" };

export default async function ShopPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  // The first page is server-rendered (fast, indexable); the rest arrives on
  // demand from the browser via ShopBrowser's "Load more".
  const [{ products, hasMore, total }, categories] = await Promise.all([
    getProductsPage({ q: sp.q, category: sp.category }),
    getCategories()
  ]);
  return (
    <div className="container-store py-5">
      <ShopBrowser
        products={products}
        hasMore={hasMore}
        total={total}
        query={{ q: sp.q, category: sp.category }}
        title={sp.q ? `Results for "${sp.q}"` : "All products"}
        initialTag={sp.tag}
        initialQuery={sp.q}
        initialCategory={sp.category}
        categories={categories}
        showCategoryFilter
      />
    </div>
  );
}
