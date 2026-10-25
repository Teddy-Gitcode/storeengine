"use client";
import { Check } from "lucide-react";
import type { BuyControls } from "@/lib/use-buy";

/* The "Add to cart / Buy now" pair.
 *
 * Three copies existed — pills in the buy box, small uppercase buttons on the
 * product card, a squat pair in the sticky mobile bar — so a change to how
 * "adding" looks had to be made three times and never was. The state already
 * comes from one hook (`useBuy`); this is the other half, the markup.
 *
 * The caller owns the hook because it usually needs the stock line and the
 * quantity limit too; calling it in here as well would run two independent
 * state machines for one product. */
export default function BuyButtons({
  buy,
  layout = "stacked",
  size = "md",
  className = "",
}: {
  buy: BuyControls;
  /** `stacked` fills the width, one above the other; `inline` sits side by
   *  side — from `sm` up, where there is room for two labels on one row. */
  layout?: "stacked" | "inline";
  size?: "sm" | "md";
  className?: string;
}) {
  const shape = size === "sm" ? "py-2 text-[12.5px]" : "py-2.5 text-[14px]";
  const base = `rounded-xl font-bold transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center justify-center gap-1.5 ${shape}`;

  return (
    /* `inline` stacks below `sm`. Both places this renders put two product
       cards across a phone, which leaves each button about 62px — narrower
       than the words "Add to cart", so it wrapped to two lines and stood
       taller than "Buy now" beside it. From `sm` the grid goes to three
       columns or more and the cards are wide enough again. */
    <div
      className={`${
        layout === "stacked" ? "grid gap-2" : "grid grid-cols-1 gap-2 sm:grid-cols-2"
      } ${className}`}
    >
      <button
        type="button"
        onClick={buy.addToCart}
        disabled={buy.state !== "idle" || !buy.canBuy}
        className={`${base} ${
          // The app's pair: the everyday add in near-black, the brand kept for
          // going straight to checkout.
          buy.state === "added"
            ? "bg-ink/80 text-bg"
            : "bg-ink text-bg hover:bg-ink/85"
        }`}
      >
        {buy.state === "added" && <Check size={size === "sm" ? 13 : 15} aria-hidden />}
        {buy.label}
      </button>
      <button
        type="button"
        onClick={buy.buyNow}
        disabled={!buy.canBuy}
        className={`${base} bg-brand text-on-brand hover:bg-brand-dark`}
      >
        Buy now
      </button>
    </div>
  );
}
