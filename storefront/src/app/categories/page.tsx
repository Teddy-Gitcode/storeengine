import CategoryCollage from "@/components/CategoryCollage";
import { getCategories } from "@/lib/catalog-api";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Categories" };

/* All Categories, as in the app: each one a card of four of its own product
   photos with the real product count. */
export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="container-store py-8">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-extrabold text-ink">All Categories</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {categories.length ? "Pick one to browse it." : "No categories yet."}
        </p>
      </header>

      {categories.length === 0 ? (
        <EmptyState
          title="Nothing to browse by category yet."
          action={{ href: "/shop", label: "Browse all products" }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCollage key={category.slug} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}
