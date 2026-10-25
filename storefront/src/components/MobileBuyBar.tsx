"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { useBuy } from "@/lib/use-buy";
import { useSelection } from "@/components/pdp/selection";
import { Check } from "lucide-react";

/* The sticky buy bar a phone gets instead of the buy box.
 *
 * It reads the same selection the page does: it used to add the base product,
 * quantity one, whatever the shopper had chosen above — so picking the 150ml
 * and tapping the bar at the bottom of the screen bought the 50ml. */
export default function MobileBuyBar() {
  const { product, variant, price, qty, mustChoose } = useSelection();
  const { state, stock, canBuy, label, addToCart, buyNow } = useBuy(product, {
    qty,
    variant,
    disabled: mustChoose,
  });

  const discount = product.priceOld ? Math.round((1 - product.price / product.priceOld) * 100) : 0;

  /* Only once the real buy box has scrolled away.
   *
   * The bar used to be pinned there the whole time, so on a phone the top of
   * the page showed "Add to cart" twice — once in the box and once an inch
   * below it — and the bar covered the box's own buttons. A sticky bar is a
   * reminder of a control that is no longer on screen; while the control is
   * visible it is just clutter over the page. */
  const [showing, setShowing] = useState(false);
  useEffect(() => {
    const box = document.getElementById("buy-box");
    // No buy box on the page (or no IntersectionObserver, as in a test
    // renderer) means the bar is the only way to buy: show it.
    if (!box || typeof IntersectionObserver === "undefined") {
      setShowing(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShowing(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px" },
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      hidden={!showing}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line/10 bg-surface
                 shadow-[0_-6px_18px_rgba(0,0,0,0.08)] motion-safe:animate-[msg-in_160ms_ease-out] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center gap-2 p-2">
        {/* Price chip — small, anchors the user to what they're paying */}
        <div className="px-1 shrink-0">
          <div className="text-[11px] text-ink-muted leading-none">
            {discount > 0 ? `Save ${discount}%` : "Price"}
          </div>
          <div className="font-display text-[16px] font-extrabold text-ink tabular-nums leading-tight mt-0.5">
            {money(price)}
          </div>
        </div>

        {/* Two CTAs, share remaining width */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={addToCart}
            disabled={state !== "idle" || !canBuy}
            className={`rounded-xl py-3 text-[13px] font-bold text-bg transition-colors active:scale-[0.98] ${
              state === "added" ? "bg-ink/80" : "bg-ink hover:bg-ink/85"
            } disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5`}
          >
            {state === "added" && <Check size={14} aria-hidden />}
            {label}
          </button>
          <button
            type="button"
            onClick={buyNow}
            disabled={!canBuy}
            className="rounded-xl py-3 text-[13px] font-bold bg-brand text-on-brand hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Buy now
          </button>
        </div>
      </div>
    </div>
  );
}
