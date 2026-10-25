// Base URL of the customer storefront, used for "view on store" / preview links
// from the admin. Set NEXT_PUBLIC_STOREFRONT_URL in production
// (e.g. https://tedstore.teddylan.com); falls back to local dev.
export const STOREFRONT_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000';

export function storefrontUrl(path = '/'): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${STOREFRONT_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
