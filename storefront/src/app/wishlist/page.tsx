"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist-store";
import { getProductsByIds } from "@/lib/catalog-api";
import ProductGrid from "@/components/ProductGrid";
import EmptyState from "@/components/ui/EmptyState";
import type { Product } from "@/lib/types";

export default function WishlistPage() {
  const ids = useWishlist((s) => s.ids);
  const idsKey = ids.join(",");
  const [loaded, setLoaded] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) {
      setLoaded([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getProductsByIds(ids)
      .then((products) => {
        if (!cancelled) setLoaded(products);
      })
      .catch(() => {
        if (!cancelled) setLoaded([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-resolve whenever the saved set changes (add elsewhere / remove here).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // Only show items still saved, so un-hearting removes the card immediately.
  const products = loaded.filter((p) => ids.includes(p.productId));

  return (
    <div className="container-store py-8">
      <div className="flex items-center gap-2.5 mb-6">
        <Heart size={22} className="text-brand" fill="currentColor" />
        <h1 className="font-display text-[26px] font-bold text-ink">Your wishlist</h1>
        {products.length > 0 && (
          <span className="text-[13px] text-ink-muted">
            {products.length} {products.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-px bg-line/5 border border-line/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Heart size={28} className="text-brand" />}
          title="Nothing saved yet"
          description="Tap the heart on any product to keep it here for later."
          action={{ href: "/shop", label: "Browse products" }}
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
