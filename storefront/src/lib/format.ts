type CurrencyConfig = {
  symbol: string;
  locale: string;
  /* What a catalogue price is multiplied by to reach the shopper's currency.
     1 for a shopper paying in the currency prices are written in.

     Catalogue prices are bare numbers: `Product.price = 271` means 271 of the
     store's base currency and nothing else. Showing that to an international
     shopper as "$271" would be a hundred-and-thirty-fold overcharge, so a
     display currency is never only a symbol swap. */
  rate: number;
  /* The base currency's own code and symbol, kept so an amount already in a
     known currency — an order total, which the API returns in whatever it was
     charged in — can be formatted with the right mark rather than the
     shopper's. */
  baseCode: string;
  baseSymbol: string;
  code: string;
};

// Defaults are overridden from StoreSettings: server-side in the root layout,
// client-side by StoreProvider.
let currency: CurrencyConfig = {
  symbol: "$",
  locale: "en-US",
  rate: 1,
  baseCode: "USD",
  baseSymbol: "$",
  code: "USD",
};

export function configureCurrency(config: Partial<CurrencyConfig>): void {
  currency = { ...currency, ...config };
}

export function displayCurrency(): CurrencyConfig {
  return currency;
}

/** The same formatting as [money], against a currency passed in rather than
 *  the configured one.
 *
 *  `generateMetadata` needs this: it can run before the root layout has called
 *  `configureCurrency`, so reading the module's own currency there would print
 *  a shop's prices in dollars on the strength of a default nobody chose — and
 *  in a link preview, which is the one place the number is not corrected a
 *  second later by the page itself. */
/** Rounded to two places the way apps/core/currency.py does (half-up). The
 *  epsilon absorbs float noise so 2.675 rounds to 2.68 as the server does. */
function toCents(amount: number): number {
  return Math.round((amount + Math.sign(amount) * 1e-9) * 100) / 100;
}

export function formatMoney(
  amount: number,
  // Only what it actually reads, so a caller that has a symbol and a locale —
  // `generateMetadata`, which has settings but no configured currency — can use
  // it without inventing a rate it has no use for.
  config: { symbol: string; locale: string },
): string {
  // toLocaleString's default is up to three fraction digits and no minimum, so
  // a price of 440.80 rendered as "440.8" — a currency amount one digit short.
  // Whole amounts stay whole; anything with a fraction gets both digits.
  // To the cent first, half-up like the server: a converted price lands on
  // 26.0000003, which is $26 and not "$26.00" — or worse, "$25.99".
  amount = toCents(amount);
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `${config.symbol} ${amount.toLocaleString(config.locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** A catalogue amount, converted to the shopper's currency and formatted.
 *
 *  This is the default because most amounts on the site come from the
 *  catalogue — a price, a cart subtotal, a unit price — and all of them are
 *  written in the store's base currency. An amount that is *already* in a
 *  currency, which is every total the orders API returns, goes through
 *  [charged] instead so it is not converted twice. */
export function money(amount: number): string {
  return formatMoney(amount * currency.rate, currency);
}

/** An amount already denominated in [code] — an order total, which the API
 *  returns in whatever currency it was charged in.
 *
 *  Not converted, and formatted with that currency's own mark: an order placed
 *  in dollars stays dollars when a shopper at home looks back at it, rather
 *  than being relabelled in shillings at the same number. */
export function charged(amount: number, code?: string | null): string {
  const wanted = (code || currency.baseCode).toUpperCase();
  const symbol =
    wanted === currency.baseCode.toUpperCase()
      ? currency.baseSymbol
      : wanted === currency.code.toUpperCase()
        ? currency.symbol
        : wanted;
  return formatMoney(amount, { symbol, locale: currency.locale });
}

export function currencySymbol(): string {
  return currency.symbol;
}

/** The same amount, split so a price can be set the way shops set them: the
 *  symbol small and raised, the whole number large, the cents raised beside it.
 *  `fraction` is empty for whole amounts, which is why it is not padded. */
export function priceParts(amount: number): {
  symbol: string;
  whole: string;
  fraction: string;
} {
  // Converted, like [money], and for the same reason: every caller of this is
  // a catalogue price. `<Price>` renders it on every product card, so leaving
  // it unconverted would put the shopper's symbol on the base currency's
  // number — the overcharge this whole feature exists to avoid, on the most
  // visible surface in the shop.
  amount = toCents(amount * currency.rate);
  const digits = Number.isInteger(amount) ? 0 : 2;
  const text = amount.toLocaleString(currency.locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  // Ask the locale what it puts between units and fraction rather than assuming
  // a dot: half the world writes 179,91.
  const separator = (1.1).toLocaleString(currency.locale).replace(/[\d\s]/g, "");
  const [whole, fraction = ""] = separator ? text.split(separator) : [text];
  return { symbol: currency.symbol, whole, fraction };
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
