import type { StoreSettings } from "./settings-api";

/* What the merchant charges to deliver, in one place.
 *
 * `Number(settings.free_shipping_threshold)` appeared in six files, and the
 * rule built on top of it — free over the threshold, the flat fee otherwise,
 * nothing on an empty basket — was written out twice, in the cart and again at
 * checkout. Two copies of a pricing rule is one waiting to disagree with the
 * other about what somebody owes. */

export type ShippingTerms = {
  /** Spend at or above this and delivery is free. 0 means no such offer. */
  threshold: number;
  /** What delivery costs otherwise. 0 means the shop does not charge for it. */
  flatFee: number;
};

export function shippingTerms(
  settings: Pick<StoreSettings, "free_shipping_threshold" | "flat_shipping_fee">,
): ShippingTerms {
  return {
    threshold: Number(settings.free_shipping_threshold) || 0,
    flatFee: Number(settings.flat_shipping_fee) || 0,
  };
}

/** Delivery on this basket. `free` is for a coupon that pays it for them. */
export function shippingCost(
  subtotal: number,
  terms: ShippingTerms,
  { free = false }: { free?: boolean } = {},
): number {
  if (free || subtotal === 0) return 0;
  if (terms.threshold > 0 && subtotal >= terms.threshold) return 0;
  return terms.flatFee;
}

/** How close this basket is to free delivery, for the meter in the cart. */
export function freeShippingProgress(
  subtotal: number,
  terms: ShippingTerms,
): { remaining: number; progress: number } {
  if (terms.threshold <= 0) return { remaining: 0, progress: 0 };
  return {
    remaining: Math.max(0, terms.threshold - subtotal),
    progress: Math.min(1, subtotal / terms.threshold),
  };
}
