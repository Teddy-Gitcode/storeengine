"use client";
import { createContext, useContext, useMemo, useState } from "react";
import type { Product, ProductVariantInfo } from "@/lib/types";

/* The chosen variation and quantity, shared across the product page.
 *
 * The three columns of this layout are separate components in separate grid
 * cells — the swatches sit beside the title, the price is read in two places
 * and the buy box is off to the right — but they are all one decision. Holding
 * it here is what lets the swatch strip change the buy box's price and what
 * "Add to cart" actually adds.
 *
 * The provider is a client component wrapping server-rendered children, so the
 * page itself stays a server component. */

type Selection = {
  product: Product;
  variants: ProductVariantInfo[];
  variantId: number | undefined;
  setVariantId: (id: number) => void;
  variant: ProductVariantInfo | undefined;
  /** What this product costs as currently chosen — a variation may reprice it. */
  price: number;
  qty: number;
  setQty: (qty: number) => void;
  /** True when the product is sold in variations and none is chosen yet. */
  mustChoose: boolean;
};

const Ctx = createContext<Selection | null>(null);

export function useSelection(): Selection {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSelection must be used inside <SelectionProvider>");
  return value;
}

/** The selection when there is one — for parts, like the gallery, that are
 *  also used on pages that sell nothing in variations. */
export function useOptionalSelection(): Selection | null {
  return useContext(Ctx);
}

export function SelectionProvider({
  product,
  children,
}: {
  product: Product;
  children: React.ReactNode;
}) {
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  // Open on the option the card priced — whichever sells most, else the
  // merchant's default — so the page confirms the figure that got them here
  // rather than repricing on arrival. If that one is gone, the first in stock;
  // nothing is chosen when they are all sold out.
  const [variantId, setVariantId] = useState<number | undefined>(() => {
    const headline = variants.find((v) => v.id === product.headlineVariantId);
    if (headline && headline.stockQty > 0) return headline.id;
    return (variants.find((v) => v.stockQty > 0) ?? headline ?? variants[0])?.id;
  });
  const [qty, setQty] = useState(1);
  const variant = variants.find((v) => v.id === variantId);

  const value = useMemo<Selection>(
    () => ({
      product,
      variants,
      variantId,
      // Quantity resets with the variation: "4" of a size with three left is
      // not a request anyone made.
      setVariantId: (id: number) => {
        setVariantId(id);
        setQty(1);
      },
      variant,
      price: variant?.price ?? product.price,
      qty,
      setQty,
      mustChoose: variants.length > 0 && !variant,
    }),
    [product, variants, variantId, variant, qty],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
