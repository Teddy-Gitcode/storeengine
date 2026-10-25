"use client";
import { useEffect, useState } from "react";
import { getPaymentMethods, type PaymentMethodOption } from "@/lib/orders-api";
import { useShopperLocale } from "@/lib/store-context";

/* What this store actually takes, from Payments → Payment Method.
 *
 * The cart, the checkout and the product page each fetched this themselves and
 * each swallowed failures in a slightly different way. One hook, one behaviour:
 * an unreachable endpoint yields an empty list, and every caller already treats
 * "no configured methods" as "show nothing rather than invent Visa". */
export function usePaymentMethods(country?: string | null, currency?: string | null): PaymentMethodOption[] {
  // Without an explicit delivery country, the shopper as the edge sees them.
  const locale = useShopperLocale();
  const where = country ?? locale.country;
  const paying = currency ?? locale.current.code;
  // Every order is paid for up front, inside a ten-minute hold, so cash on
  // delivery is never offered — even by a store that left it switched on in
  // admin, which the checkout API would refuse anyway. And there is no
  // fallback list: a store with nothing enabled cannot take an order.
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPaymentMethods(where, paying)
      .then((list) => !cancelled && setMethods(list.filter((m) => m.method !== "cod")))
      .catch(() => !cancelled && setMethods([]));
    return () => {
      cancelled = true;
    };
  }, [where, paying]);

  return methods;
}
