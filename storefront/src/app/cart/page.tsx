"use client";
import Link from "next/link";
import StoreImage from "@/components/ui/StoreImage";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ShoppingCart, Truck } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useStoreSettings } from "@/lib/store-context";
import { money } from "@/lib/format";
import { usePaymentMethods } from "@/lib/use-payment-methods";
import { freeShippingProgress, shippingCost, shippingTerms } from "@/lib/shipping";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const count = useCart((s) => s.count());
  const subtotal = useCart((s) => s.subtotal());
  const settings = useStoreSettings();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Which methods the merchant has switched on — the footnote used to promise
  // "cards, mobile money and more" whether or not any of them were configured.
  const methods = usePaymentMethods();

  const terms = shippingTerms(settings);
  const threshold = terms.threshold;
  const shipping = shippingCost(subtotal, terms);
  const total = subtotal + shipping;
  const { remaining: shipRemaining, progress: shipProgress } = freeShippingProgress(subtotal, terms);

  if (!mounted) {
    return <div className="container-store py-12 text-ink-muted">Loading cart…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-store py-16 text-center">
        <div className="max-w-md mx-auto">
          <ShoppingCart
            size={48}
            strokeWidth={1.25}
            className="mx-auto mb-4 text-ink-muted/50"
            aria-hidden
          />
          <h1 className="font-display text-[26px] font-extrabold text-ink mb-2">Your cart is empty</h1>
          <p className="text-ink-muted mb-6">Browse our products and add a few favourites.</p>
          <Link href="/shop" className="btn-primary">Browse all products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-store py-8">
      <h1 className="font-display text-[28px] font-extrabold text-ink mb-6">Cart <span className="ml-1 inline-grid h-8 min-w-8 place-items-center rounded-full bg-blob px-2 align-middle text-[16px]">{count} item{count === 1 ? "" : "s"}</span></h1>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <ul className="flex min-w-0 flex-col gap-3">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 py-2">
              <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0 overflow-hidden rounded-xl border-[5px] border-surface bg-surface-alt shadow-photo">
                <StoreImage src={i.image} alt={i.title} fill sizes="(max-width: 640px) 88px, 104px" className="object-cover" />
              </div>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${i.slug}`} className="text-[14px] text-ink hover:text-brand line-clamp-2">{i.title}</Link>
                  {i.variantLabel && (
                    <div className="mt-1 text-[13px] font-semibold text-ink">{i.variantLabel}</div>
                  )}
                  {/* One price per line: what this line costs, big; the unit price small
                      under it. Two bold prices with a bold count between them
                      was the confusing part. */}
                  <div className="mt-1 font-display text-[17px] font-extrabold text-ink tabular-nums">{money(i.price * i.qty)}</div>
                  {i.qty > 1 && <div className="text-[12px] text-ink-muted tabular-nums">{money(i.price)} each</div>}
                  {i.maxQty !== undefined && i.qty >= i.maxQty && (
                    <div className="text-[12px] text-danger mt-0.5">Only {i.maxQty} in stock</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {/* Labelled and quiet — a control, not a figure. A bold number in a
                      pink box beside the bold price read as part of the price. */}
                  <div className="flex items-center gap-1.5">
                    <span className="mr-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Qty</span>
                    <button
                      type="button"
                      onClick={() => setQty(i.id, i.qty - 1)}
                      disabled={i.qty <= 1}
                      className="grid h-8 w-8 place-items-center rounded-full border-2 border-line/30 text-[17px] leading-none text-ink-muted hover:border-ink hover:text-ink disabled:text-ink-faint disabled:hover:border-line/30 disabled:hover:text-ink-faint"
                      aria-label={`Decrease quantity of ${i.title}`}
                    >−</button>
                    <span className="min-w-9 rounded-md border border-line/30 bg-surface px-2 py-1 text-center text-sm font-semibold tabular-nums text-ink" aria-label={`Quantity ${i.qty}`}>{i.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(i.id, i.qty + 1)}
                      disabled={i.maxQty !== undefined && i.qty >= i.maxQty}
                      className="grid h-8 w-8 place-items-center rounded-full border-2 border-line/30 text-[17px] leading-none text-ink-muted hover:border-ink hover:text-ink disabled:text-ink-faint disabled:hover:border-line/30 disabled:hover:text-ink-faint"
                      aria-label={`Increase quantity of ${i.title}`}
                    >+</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i.id)}
                    aria-label={`Remove ${i.title} from cart`}
                    className="text-xs text-ink-muted hover:text-danger underline"
                  >Remove</button>
                </div>
              </div>
            </li>
          ))}
          <li className="flex justify-between items-center mt-2">
            <button type="button" onClick={clear} className="text-xs text-ink-muted hover:text-danger underline">Clear cart</button>
            <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm text-brand font-medium hover:underline">
              <ArrowLeft size={15} aria-hidden /> Keep shopping
            </Link>
          </li>
        </ul>

        <aside className="bg-surface-alt rounded-2xl p-5 sticky top-32">
          <h2 className="font-display text-[18px] font-extrabold text-ink mb-4">Order summary</h2>

          {/* Free-shipping progress — a nudge to lift AOV (CC-4) */}
          {threshold > 0 && subtotal > 0 && (
            <div className="mb-4">
              <p className="text-[12.5px] text-ink-muted mb-1.5">
                {shipRemaining > 0 ? (
                  <>
                    Add <span className="font-semibold text-ink">{money(shipRemaining)}</span> more for{" "}
                    <span className="font-semibold text-brand">free shipping</span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-brand">
                    <Truck size={14} aria-hidden /> You&apos;ve unlocked free shipping!
                  </span>
                )}
              </p>
              <div
                className="h-2 rounded-full bg-blob overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(shipProgress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.round(shipProgress * 100)}%` }}
                />
              </div>
            </div>
          )}

          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="font-medium">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Shipping</dt>
              <dd className="font-medium">{shipping === 0 ? "Free" : money(shipping)}</dd>
            </div>
            <div className="border-t border-line/10 my-2" />
            <div className="flex justify-between text-base">
              <dt className="font-display font-extrabold">Total</dt>
              <dd className="font-display text-[20px] font-extrabold text-ink tabular-nums">{money(total)}</dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn-primary w-full mt-5 !py-3 inline-flex items-center justify-center gap-2">
            Checkout <ArrowRight size={16} aria-hidden />
          </Link>
          <p className="text-[11px] text-ink-muted mt-3 text-center">
            {methods.length > 0
              ? `Secure checkout · ${methods.map((m) => m.name).join(", ")}`
              : "Secure checkout"}
          </p>
        </aside>
      </div>
    </div>
  );
}
