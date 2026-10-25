"use client";
import { Check, ShoppingCart } from "lucide-react";
import { money } from "@/lib/format";
import { stockToneClass } from "@/lib/stock";
import { unitPrice } from "@/lib/unit-price";
import { useBuy } from "@/lib/use-buy";
import QuantityStepper from "./QuantityStepper";
import VariantSwatches from "./VariantSwatches";
import { useSelection } from "./selection";

/* Price, options, quantity and the buttons — the decision, in the detail column
   beside the gallery rather than in a separate box off to the right.
 *
 * `id="buy-box"` is what the sticky mobile bar watches: it only appears once
 * these buttons have scrolled away. */
export default function PurchasePanel() {
  const { product, variant, variants, price, qty, setQty, mustChoose } = useSelection();
  const { state, stock, canBuy, label, addToCart, buyNow } = useBuy(product, {
    qty,
    variant,
    disabled: mustChoose,
    addedLabel: "In your cart",
  });

  const trackedQty = variants.length > 0 ? variant?.stockQty ?? 0 : product.stockQty;
  const maxQty = trackedQty != null && trackedQty > 0 && !product.allowBackorder ? trackedQty : undefined;
  // The was-price belongs to the product's own price; an option priced
  // differently has no markdown to show.
  const was = product.priceOld && price === product.price ? product.priceOld : undefined;
  // The measure comes off whichever option is chosen, then the title.
  // Deliberately not `weightGrams`: that is what the parcel weighs, so every
  // 25's box carries the same 150g whatever is inside it, and dividing by it
  // would price a gift box by its packaging.
  const rate = unitPrice(price, variant?.label ?? "", product.title);

  return (
    <div id="buy-box">
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[28px] font-extrabold leading-none text-ink tabular-nums">{money(price)}</span>
        {was && <span className="text-[15px] font-semibold text-brand line-through tabular-nums">{money(was)}</span>}
      </div>

      {/* What the chosen pack works out at per gram. A range priced 25 / 48 /
          114 / 220 / 440.80 says nothing about which size is good value until
          somebody divides, so the page divides. */}
      {rate && <p className="mt-1 text-[12.5px] text-ink-muted tabular-nums">{rate}</p>}

      <VariantSwatches />

      <p className={`mt-4 text-[13px] font-semibold ${stockToneClass[stock.tone]}`}>{stock.label}</p>

      {stock.canBuy && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted">Qty</span>
          <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
        </div>
      )}

      <div className="mt-4 grid max-w-md grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={addToCart}
          disabled={state !== "idle" || !canBuy}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-bold text-bg transition-colors ${
            state === "added" ? "bg-ink/80" : "bg-ink hover:bg-ink/85"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {state === "added" ? <Check size={16} aria-hidden /> : <ShoppingCart size={16} aria-hidden />}
          {label}
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={!canBuy}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-4 text-[14px] font-bold text-on-brand transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          Buy now
        </button>
      </div>
    </div>
  );
}
