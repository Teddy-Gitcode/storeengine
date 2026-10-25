"use client";
import { Lock, Smartphone, Truck } from "lucide-react";
import { money } from "@/lib/format";
import { shippingTerms } from "@/lib/shipping";
import { useStoreSettings } from "@/lib/store-context";
import { usePaymentMethods } from "@/lib/use-payment-methods";

/* The right-hand column: "Available offers" and "Guaranteed Safe Checkout".
 *
 * Every line is something the store has actually configured — its delivery
 * terms and the payment methods switched on under Payments. The reference
 * design fills this with card-issuer promotions; a tea shop that runs none
 * should show fewer lines, not invented ones. Each card disappears when it
 * would be empty. */
export default function CheckoutAside() {
  const settings = useStoreSettings();
  // Exactly what checkout will offer.
  const methods = usePaymentMethods();
  const { threshold, flatFee } = shippingTerms(settings);

  const offers: { icon: React.ReactNode; text: React.ReactNode }[] = [];
  if (threshold > 0) {
    offers.push({
      icon: <Truck size={16} aria-hidden />,
      text: (
        <>
          Free delivery on orders over <span className="font-semibold text-ink">{money(threshold)}</span>
        </>
      ),
    });
  } else if (flatFee > 0) {
    offers.push({
      icon: <Truck size={16} aria-hidden />,
      text: (
        <>
          Delivery for a flat <span className="font-semibold text-ink">{money(flatFee)}</span>
        </>
      ),
    });
  }
  for (const method of methods.filter((m) => m.method !== "card")) {
    offers.push({
      icon: <Smartphone size={16} aria-hidden />,
      text: method.body_text ? `${method.name} — ${method.body_text}` : method.name,
    });
  }

  return (
    <div className="space-y-4">
      {offers.length > 0 && (
        <section className="rounded-2xl bg-surface-alt p-5">
          <h2 className="font-display text-[16px] font-extrabold text-ink">Available offers</h2>
          <ul className="mt-3 divide-y divide-line/15">
            {offers.map((offer, i) => (
              <li key={i} className="flex items-start gap-3 py-3 first:pt-1 last:pb-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blob text-brand">
                  {offer.icon}
                </span>
                <span className="text-[12.5px] leading-snug text-ink-muted">{offer.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {methods.length > 0 && (
        <section className="rounded-2xl bg-surface-alt p-5">
          <h2 className="flex items-center gap-1.5 text-[14px] font-bold text-brand">
            <Lock size={14} aria-hidden />
            Guaranteed Safe Checkout
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Accepted payment methods">
            {methods.map((method) => (
              <li
                key={method.id}
                title={method.name}
                className="inline-flex h-9 items-center rounded-md border border-line/20 bg-surface px-2 text-[11.5px] font-semibold text-ink"
              >
                {method.logo_url ? (
                  // Merchant-uploaded logos on any host; the checkout draws them
                  // the same way, outside the image optimiser's allow-list.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={method.logo_url} alt={method.name} className="h-6 w-auto max-w-[64px] object-contain" />
                ) : (
                  method.name
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
