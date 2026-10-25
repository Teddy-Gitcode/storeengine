/* Marketing/analytics tags configured in the admin under Marketing Tools
   (and the legacy Google Analytics field on Settings → SEO). The API only
   returns tools that are switched on AND filled in, with ids already stripped
   of anything that isn't alphanumeric — see MarketingTags for the snippets. */

import { API_BASE } from "./api-base";

export type MarketingTagKey =
  | "google-analytics"
  | "google-tag-manager"
  | "meta-pixel"
  | "tiktok-pixel"
  | "hotjar";

export type MarketingTag = {
  key: MarketingTagKey;
  name: string;
  config: Record<string, string>;
};

export async function getMarketingTags(): Promise<MarketingTag[]> {
  try {
    const response = await fetch(`${API_BASE}/storefront/marketing-tags/`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as MarketingTag[] | { results?: MarketingTag[] };
    return Array.isArray(payload) ? payload : payload.results || [];
  } catch {
    // Analytics is never worth breaking a page render over.
    return [];
  }
}
