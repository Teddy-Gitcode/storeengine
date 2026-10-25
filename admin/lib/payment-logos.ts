/**
 * Payment brand artwork copied from the Sellzy template
 * (`public/images/payment/*.svg` and `public/images/payment-logo/*`).
 *
 * The template uses the flat SVGs on the payment-method list and the square
 * raster logos on the payment-API cards and transaction tables, so both sets
 * are kept and resolved by brand key.
 */

export type PaymentBrand =
  | 'stripe' | 'paypal' | 'apple-pay' | 'google-pay' | 'skrill' | 'razorpay' | 'wise';

/** Flat mark, used where the template shows `/images/payment/*.svg`. */
export const PAYMENT_MARKS: Partial<Record<PaymentBrand, string>> = {
  stripe: '/images/payment/stripe.svg',
  paypal: '/images/payment/paypal.svg',
  'apple-pay': '/images/payment/apple-pay.svg',
  'google-pay': '/images/payment/gpay.svg',
  skrill: '/images/payment/skrill.svg',
};

/** Square logo, used where the template shows `/images/payment-logo/*`. */
export const PAYMENT_LOGOS: Record<PaymentBrand, string> = {
  stripe: '/images/payment-logo/stripe.jpeg',
  paypal: '/images/payment-logo/paypal.jpeg',
  'apple-pay': '/images/payment-logo/apple.png',
  'google-pay': '/images/payment-logo/google.jpeg',
  skrill: '/images/payment-logo/skrill.jpeg',
  razorpay: '/images/payment-logo/razor.jpeg',
  wise: '/images/payment-logo/wise.png',
};

/* Matched against the method name and provider, longest keys first so
   "apple pay" wins over a bare "apple". */
const ALIASES: [string, PaymentBrand][] = [
  ['apple pay', 'apple-pay'],
  ['apple-pay', 'apple-pay'],
  ['applepay', 'apple-pay'],
  ['google pay', 'google-pay'],
  ['google-pay', 'google-pay'],
  ['googlepay', 'google-pay'],
  ['gpay', 'google-pay'],
  ['razorpay', 'razorpay'],
  ['razor', 'razorpay'],
  ['skrill', 'skrill'],
  ['stripe', 'stripe'],
  ['paypal', 'paypal'],
  ['wise', 'wise'],
  ['apple', 'apple-pay'],
  ['google', 'google-pay'],
];

/** Best-guess brand for a free-text method name and/or provider slug. */
export function paymentBrandFor(...hints: (string | null | undefined)[]): PaymentBrand | null {
  const haystack = hints.filter(Boolean).join(' ').toLowerCase();
  if (!haystack) return null;
  for (const [alias, brand] of ALIASES) {
    if (haystack.includes(alias)) return brand;
  }
  return null;
}

/** Bundled square logo for a method, or null when nothing matches. */
export function paymentLogoFor(...hints: (string | null | undefined)[]): string | null {
  const brand = paymentBrandFor(...hints);
  return brand ? PAYMENT_LOGOS[brand] : null;
}

/** Bundled flat mark, falling back to the square logo. */
export function paymentMarkFor(...hints: (string | null | undefined)[]): string | null {
  const brand = paymentBrandFor(...hints);
  if (!brand) return null;
  return PAYMENT_MARKS[brand] ?? PAYMENT_LOGOS[brand];
}
