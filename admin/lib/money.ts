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

export function moneyFormatter(settings: Formattable, fractionDigits = 0) {
  const locale = settings?.locale || 'en-US';
  const currency = settings?.currency_code || 'USD';
  const format = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: fractionDigits,
  });
  return (value: string | number | null | undefined) => format.format(Number(value ?? 0));
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
