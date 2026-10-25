"use client";

import { createContext, useContext, useMemo } from "react";
import { defaultStoreSettings, type StoreSettings } from "./settings-api";
import { configureCurrency } from "./format";
import { currencyChoices, shopperCurrency, type ShopperCurrency } from "./shopper-currency";

const StoreContext = createContext<StoreSettings>(defaultStoreSettings);

type ShopperLocale = {
  /** The visitor's country from the edge (IP), or null when unknown. */
  country: string | null;
  /** Their KSh/USD pick from the switch, if any. */
  choice: string | null;
  /** What prices are shown in right now. */
  current: ShopperCurrency;
  /** What they may switch between — one entry means there is no switch. */
  options: ShopperCurrency[];
};
const LocaleContext = createContext<ShopperLocale | null>(null);

/**
 * Makes StoreSettings available to client components and keeps the money
 * formatter in sync with the store's configured currency.
 */
export function StoreProvider({
  settings,
  country,
  currencyChoice,
  children,
}: {
  settings: StoreSettings;
  /** Resolved on the server from the edge cookie and passed down, rather than
   *  re-read here: the client reading it separately is how a price renders in
   *  one currency and then swaps to another a frame later. */
  country?: string | null;
  /** The currency switch's cookie, resolved on the server for the same reason. */
  currencyChoice?: string | null;
  children: React.ReactNode;
}) {
  const current = shopperCurrency(settings, country, currencyChoice);
  configureCurrency({ ...current, locale: settings.locale });
  const locale = useMemo<ShopperLocale>(
    () => ({
      country: country ?? null,
      choice: currencyChoice ?? null,
      current,
      options: currencyChoices(settings, country),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, country, currencyChoice],
  );
  return (
    <StoreContext.Provider value={settings}>
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </StoreContext.Provider>
  );
}

export function useShopperLocale(): ShopperLocale {
  const value = useContext(LocaleContext);
  if (value) return value;
  const fallback = shopperCurrency(defaultStoreSettings, null);
  return { country: null, choice: null, current: fallback, options: [fallback] };
}

export function useStoreSettings(): StoreSettings {
  return useContext(StoreContext);
}
