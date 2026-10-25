import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  products,
  dense = false,
  sidebar = false
}: {
  products: Product[];
  dense?: boolean;
  /** Grid sits next to the 240px filter sidebar — use fewer columns so cards keep a normal width. */
  sidebar?: boolean;
}) {
  if (!products.length) {
    return (
      <div className="py-16 text-center text-ink-muted">
        <p className="text-lg">No products match your filters.</p>
        <p className="text-sm mt-2">Try clearing filters or browsing all products.</p>
      </div>
    );
  }
  const cols = dense
    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    : sidebar
      ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5";
  return (
    // Shoppe spacing: framed cards with room between them, not a ruled grid.
    <ul role="list" className={`grid ${cols} gap-x-3 gap-y-7 sm:gap-x-4`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}
