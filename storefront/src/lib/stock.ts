import type { Product } from "./types";

const LOW_STOCK_THRESHOLD = 5;

export type StockTone = "ok" | "low" | "backorder" | "out";

export type StockStatus = {
  tone: StockTone;
  label: string;
  /** Whether the product can be added to the cart. */
  canBuy: boolean;
};

/**
 * Derives customer-facing availability from the backend stock signal.
 * `stockQty == null` means stock isn't tracked for this product — treat it as
 * available (the store simply isn't managing inventory for it).
 */
/** How each availability reads: green for yes, amber for hurry, red for no.
 *  Beside the derivation so a new surface cannot invent its own colour for
 *  "only 2 left" — which is exactly how one column came to say "in stock" in
 *  grey next to a buy box saying it in green. */
export const stockToneClass: Record<StockTone, string> = {
  ok: "text-green-700 dark:text-green-400",
  low: "text-amber-600 dark:text-amber-400",
  backorder: "text-ink-muted",
  out: "text-danger",
};

export function stockStatus(product: Pick<Product, "stockQty" | "allowBackorder">): StockStatus {
  const qty = product.stockQty;

  if (qty == null) {
    return { tone: "ok", label: "In stock", canBuy: true };
  }
  if (qty <= 0) {
    return product.allowBackorder
      ? { tone: "backorder", label: "Available on backorder", canBuy: true }
      : { tone: "out", label: "Out of stock", canBuy: false };
  }
  if (qty <= LOW_STOCK_THRESHOLD) {
    return { tone: "low", label: `Only ${qty} left`, canBuy: true };
  }
  return { tone: "ok", label: "In stock", canBuy: true };
}
