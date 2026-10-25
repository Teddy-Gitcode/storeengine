"use client";
import { money } from "@/lib/format";

/* A catalogue amount in the shopper's currency, as text.
 *
 * A client component on purpose. Server components render before — and
 * concurrently with — the root layout that configures the currency, so a
 * price formatted there could use the previous request's currency: a
 * Kenyan's shillings shown to the next shopper as "$". Client components
 * render under StoreProvider, which sets this visitor's currency first. */
export default function Money({ amount }: { amount: number }) {
  return <>{money(amount)}</>;
}
