export type StoreSettings = {
  business_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  brand_color: string;
  brand_color_dark: string;
  accent_color: string;
  accent_color_dark: string;
  currency_code: string;
  currency_symbol: string;
  locale: string;
  support_email: string;
  support_phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  announcement: string;
  free_shipping_threshold: string;
  flat_shipping_fee: string;
  social_links: Record<string, string>;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image_url: string;
  google_site_verification: string;
  /** Set in the admin under Settings → Maintains Settings. */
  home_country_code?: string;
  /** Blank switches the second currency off; everyone then pays the base. */
  secondary_currency_code?: string;
  secondary_currency_symbol?: string;
  /** Base × this = the secondary currency. */
  secondary_currency_rate?: string | number;
  maintenance_mode: boolean;
  maintenance_message: string;
  is_onboarded: boolean;
};

import { API_BASE } from "./api-base";
import { mediaSrc } from "./images";

/* Only ever used when the settings API is unreachable, which makes every
   non-empty value here something the storefront says on a merchant's behalf
   without having asked. The tagline promised delivery to the door and the
   support address was support@example.com — a live footer mailto, legal
   contact and maintenance screen all pointing at a domain reserved for
   documentation. Blank renders nothing; a placeholder renders a lie. */
export const defaultStoreSettings: StoreSettings = {
  business_name: "My Store",
  tagline: "",
  logo_url: "",
  favicon_url: "",
  brand_color: "#1D4ED8",
  brand_color_dark: "#1E3A8A",
  accent_color: "#F59E0B",
  accent_color_dark: "#78350F",
  currency_code: "USD",
  currency_symbol: "$",
  locale: "en-US",
  support_email: "",
  support_phone: "",
  whatsapp: "",
  address: "",
  city: "",
  country: "",
  announcement: "",
  free_shipping_threshold: "0",
  flat_shipping_fee: "0",
  social_links: {},
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  og_image_url: "",
  google_site_verification: "",
  // Never default to "closed": if the settings API is unreachable, the store
  // has to stay open rather than lock every shopper out.
  home_country_code: "",
  secondary_currency_code: "",
  secondary_currency_symbol: "",
  secondary_currency_rate: 0,
  maintenance_mode: false,
  maintenance_message: "",
  is_onboarded: false,
};

/** Server-side fetch of the store's white-label configuration. */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const response = await fetch(`${API_BASE}/store/settings/`, { next: { revalidate: 60 } });
    if (!response.ok) return defaultStoreSettings;
    const data = (await response.json()) as Partial<StoreSettings>;
    const settings = { ...defaultStoreSettings, ...data };
    // Branding is stored as free text, so these carry whatever host the admin
    // was pointed at when the file was uploaded. Re-home them onto the origin
    // this visitor can reach — otherwise the logo is a localhost URL, which on
    // anyone else's device resolves to their own machine.
    return {
      ...settings,
      logo_url: mediaSrc(settings.logo_url),
      favicon_url: mediaSrc(settings.favicon_url),
      og_image_url: mediaSrc(settings.og_image_url),
    };
  } catch {
    return defaultStoreSettings;
  }
}

/** "#1D4ED8" -> "29 78 216" for use in `rgb(var(--brand) / <alpha>)`. */
export function hexToRgbTriplet(hex: string, fallback = "29 78 216"): string {
  const match = /^#?([0-9a-f]{6})/i.exec(hex.trim());
  if (!match) return fallback;
  const value = parseInt(match[1], 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
}

/** CSS custom properties injected into the document by the root layout. */
export function themeCssVariables(settings: StoreSettings): string {
  return [
    ":root{",
    `--brand:${hexToRgbTriplet(settings.brand_color)};`,
    `--brand-dark:${hexToRgbTriplet(settings.brand_color_dark, "30 58 138")};`,
    `--accent:${hexToRgbTriplet(settings.accent_color, "245 158 11")};`,
    `--accent-dark:${hexToRgbTriplet(settings.accent_color_dark, "120 53 15")};`,
    "}",
  ].join("");
}
