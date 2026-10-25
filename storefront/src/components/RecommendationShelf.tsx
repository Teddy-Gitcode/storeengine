"use client";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { getRecommendations } from "@/lib/catalog-api";
import ProductMiniCard from "@/components/product/ProductMiniCard";
import Shelf from "@/components/ui/Shelf";

export default function RecommendationShelf({
  productIds,
  title = "Customers also bought",
}: {
  productIds: number[];
  title?: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const key = productIds.join(",");

  useEffect(() => {
    if (!key) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    getRecommendations(key.split(",").map(Number))
      .then((results) => {
        if (!cancelled) setProducts(results);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (products.length === 0) return null;

  /* A row you scroll, not a grid cut off at four. The endpoint returns more
     than four recommendations and the grid silently threw the rest away — on a
     phone that was two products, which is not a recommendation, it is a
     coincidence. */
  return (
    <Shelf title={title} className="mt-10">
      {products.map((product) => (
        <ProductMiniCard key={product.id} product={product} />
      ))}
    </Shelf>
  );
}
