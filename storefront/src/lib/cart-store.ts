"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, ProductVariantInfo } from "./types";

export type CartItem = {
  /** Line key. Two variants of one product are two lines, so it carries both. */
  id: string;
  productId: number;
  variantId?: number;
  variantLabel?: string;
  slug: string;
  title: string;
  price: number;
  image: string;
  qty: number;
  /** On-hand units this line may not exceed. Undefined = stock untracked or
   *  backorders allowed, so there is nothing to cap. */
  maxQty?: number;
};

/** What the catalogue says is on hand for the exact thing being bought. */
function availableQty(p: Product, variant?: ProductVariantInfo): number | undefined {
  if (p.allowBackorder) return undefined;
  const qty = variant ? variant.stockQty : p.stockQty;
  return typeof qty === "number" ? Math.max(0, qty) : undefined;
}

function capQty(qty: number, max?: number) {
  return Math.max(1, typeof max === "number" ? Math.min(qty, Math.max(max, 1)) : qty);
}

/** "12" for a plain product, "12::v34" once a variation is chosen. */
function lineKey(productKey: string, variantId?: number) {
  return variantId ? `${productKey}::v${variantId}` : productKey;
}

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  add: (p: Product, qty?: number, variant?: ProductVariantInfo) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      add: (p, qty = 1, variant) =>
        set((state) => {
          const id = lineKey(p.id, variant?.id);
          const maxQty = availableQty(p, variant);
          const existing = state.items.find((i) => i.id === id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, maxQty, qty: capQty(i.qty + qty, maxQty) } : i
              )
            };
          }
          return {
            items: [
              ...state.items,
              {
                id,
                productId: p.productId,
                variantId: variant?.id,
                variantLabel: variant?.label,
                slug: p.slug,
                title: p.title,
                // A variation may cost more or less than the base product.
                price: variant?.price ?? p.price,
                image: variant?.imageUrl || p.image,
                qty: capQty(qty, maxQty),
                maxQty
              }
            ]
          };
        }),
      remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      setQty: (id, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, qty: capQty(qty, i.maxQty) } : i))
            .filter((i) => i.qty > 0)
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.qty, 0)
    }),
    {
      name: "store-cart",
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      }
    }
  )
);
