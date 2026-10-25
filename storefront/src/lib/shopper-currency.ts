import type { StoreSettings } from "./settings-api";

/* Which currency this shopper sees, and what to multiply catalogue prices by.

   Mirrors the server's apps/core/currency.py, because the two have to agree:
   the storefront decides what a shopper is *shown* and checkout decides what
   they are *charged*, and a disagreement between those is the worst bug this
   feature could have. Both read the same settings and apply the same rule —
   home country pays the prices as written, everyone else pays the converted
   amount, and an unknown country gets the base because the prices are already
   written in it. */
export type ShopperCurrency = {
  symbol: string;
  code: string;
  rate: number;
  baseCode: string;
  baseSymbol: string;
};

/** The currencies this shopper may use, default first — mirrors
 *  apps/core/currency.py `choices_for_country`. At home (or when the country
 *  is unknown) either one; abroad, only the secondary. */
export function currencyChoices(
  settings: StoreSettings,
  country: string | null | undefined,
): ShopperCurrency[] {
  const baseCode = settings.currency_code || "USD";
  const baseSymbol = settings.currency_symbol || "$";
  const base: ShopperCurrency = { symbol: baseSymbol, code: baseCode, rate: 1, baseCode, baseSymbol };

  const code = (settings.secondary_currency_code || "").trim().toUpperCase();
  const rate = Number(settings.secondary_currency_rate ?? 0);
  if (!code || !Number.isFinite(rate) || rate <= 0) return [base];
  const other: ShopperCurrency = {
    symbol: (settings.secondary_currency_symbol || code).trim(),
    code,
    rate,
    baseCode,
    baseSymbol,
  };

  const home = (settings.home_country_code || "").trim().toUpperCase();
  const here = (country || "").trim().toUpperCase();
  if (!here || !home || here === home) return [base, other];
  return [other];
}

/** What this shopper sees: their pick when it is one of their choices, else
 *  the default for where they are. Mirrors the server's `for_country`. */
export function shopperCurrency(
  settings: StoreSettings,
  country: string | null | undefined,
  choice?: string | null,
): ShopperCurrency {
  const options = currencyChoices(settings, country);
  const wanted = (choice || "").trim().toUpperCase();
  return options.find((o) => o.code === wanted) ?? options[0];
}

/** The cookie the currency switch writes; read by the root layout. */
export const CURRENCY_COOKIE = "shopper_currency";
