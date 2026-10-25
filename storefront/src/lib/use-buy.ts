"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { stockStatus, type StockStatus } from "@/lib/stock";
import type { Product, ProductVariantInfo } from "@/lib/types";

/* Adding to the cart, in the one place that knows how.
 *
 * The same short state machine — idle, a beat of "Adding…", a moment of
 * confirmation, back to idle — was written out three times: on the product
 * card, in the sticky mobile bar and in the buy box. They had drifted (250ms
 * here, 220ms there; "Added" against "In your cart") and each new surface
 * copied whichever it was pasted from. The pause is deliberate: an instant
 * relabel reads as a click that did nothing.
 *
 * Availability comes back from here too, because "can this be bought" and
 * "what happens when they click buy" are the same question, and a caller that
 * answers one without the other is how a sold-out variation stays clickable. */

export type BuyState = "idle" | "loading" | "added";

/** Everything a set of buy controls needs. Callers pass this straight to
 *  `<BuyButtons>` rather than the component calling the hook a second time —
 *  two instances would be two independent state machines on one product. */
export type BuyControls = {
  state: BuyState;
  stock: StockStatus;
  canBuy: boolean;
  label: string;
  addToCart: () => void;
  buyNow: () => void;
};

const PENDING_MS = 250;
const CONFIRMED_MS = 1600;

export function useBuy(
  product: Product,
  options: {
    qty?: number;
    variant?: ProductVariantInfo;
    disabled?: boolean;
    /** Confirmation wording, where a wider button has room for more. The tick
     *  beside it is drawn by the buttons, off `state`, not baked in here. */
    addedLabel?: string;
  } = {},
): BuyControls {
  const { qty = 1, variant, disabled = false, addedLabel = "Added" } = options;
  const add = useCart((s) => s.add);
  const router = useRouter();
  const [state, setState] = useState<BuyState>("idle");

  // With variations, availability is the chosen one's: a product can have
  // plenty in total while the size somebody wants is gone.
  const stock = stockStatus(
    variant ? { ...product, stockQty: variant.stockQty } : product,
  );
  const canBuy = stock.canBuy && !disabled;

  return {
    state,
    stock,
    canBuy,
    // One mapping from state to wording: three surfaces had their own nested
    // ternary, and a sold-out variation read "Add to cart" in one of them.
    label: !stock.canBuy
      ? "Out of stock"
      : disabled
        ? "Choose an option"
        : state === "loading"
          ? "Adding…"
          : state === "added"
            ? addedLabel
            : "Add to cart",
    addToCart() {
      if (state !== "idle" || !canBuy) return;
      setState("loading");
      setTimeout(() => {
        add(product, qty, variant);
        setState("added");
        setTimeout(() => setState("idle"), CONFIRMED_MS);
      }, PENDING_MS);
    },
    buyNow() {
      if (!canBuy) return;
      add(product, qty, variant);
      router.push("/checkout");
    },
  };
}
