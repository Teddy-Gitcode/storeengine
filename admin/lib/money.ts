import type { StoreSettings } from '@/lib/admin-types';

/* One place that knows how this shop writes a number.
 *
 * There were twenty-three call sites building their own `Intl.NumberFormat`,
 * and they disagreed: the orders list read the store's locale and currency,
 * the order detail page hardcoded `en-US` and printed the currency code as a
 * bare prefix. The same order read "KSh 1,240" on one screen and "KES 1240" on
 * the next, which is the sort of difference that makes someone check whether
 * they are looking at the same order.
 */

type Formattable = Pick<StoreSettings, 'currency_code' | 'locale'> | null | undefined;

/** Pass an order's own `currency` for anything read off that order: its
 *  totals are in what the shopper was charged in, which is not always the
 *  store's currency. A $100 order printed with the store's would read
 *  "KSh 100". Leave it out for figures already in the store's currency. */
export function moneyFormatter(settings: Formattable, fractionDigits = 0) {
  const locale = settings?.locale || 'en-US';
  const base = settings?.currency_code || 'USD';
  const formats = new Map<string, Intl.NumberFormat>();
  const formatFor = (currency: string) => {
    let format = formats.get(currency);
    if (!format) {
      // Whole shillings suit the store's own lists, but rounding a foreign
      // order the same way prints $7.70 as $8, so those keep their cents.
      format = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        ...(currency === base ? { maximumFractionDigits: fractionDigits } : {}),
      });
      formats.set(currency, format);
    }
    return format;
  };
  return (value: string | number | null | undefined, currency?: string | null) =>
    formatFor(currency || base).format(Number(value ?? 0));
}

/** An order total in the store's currency, for adding orders together.
 *  `fx_rate` is what base prices were multiplied by at checkout. */
export function baseTotal(order: { grand_total: string | number; fx_rate?: string | number | null }) {
  const rate = Number(order.fx_rate) || 1;
  return Number(order.grand_total) / rate;
}

export function numberFormatter(settings: Formattable) {
  const format = new Intl.NumberFormat(settings?.locale || 'en-US');
  return (value: number) => format.format(value);
}

/** Dates, the same way everywhere: "14 Sep 2026". Day first because that is
 *  how the shop's own market writes one. */
export function dateFormatter(settings: Formattable, withTime = false) {
  const locale = settings?.locale || 'en-US';
  const format = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
  return (value: string | null | undefined) => (value ? format.format(new Date(value)) : '—');
}
