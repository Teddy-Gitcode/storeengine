'use server';

import { revalidatePath } from 'next/cache';
import { getStoreSettings, updateStoreSettings } from '@/lib/admin-api';
import type { StoreSettings } from '@/lib/admin-types';

export async function getSettingsAction(): Promise<StoreSettings | null> {
  try {
    return await getStoreSettings();
  } catch {
    return null;
  }
}

/* Only the fields the submitted form actually carried.
 *
 * Every settings card posts itself, so a card that holds three fields sends
 * three. Sending the whole model from every form is how editing the shop's
 * phone number came to overwrite the currency with whatever the last page
 * render happened to hold.
 */
const TEXT_FIELDS = [
  'business_name', 'tagline', 'logo_url', 'favicon_url',
  'support_email', 'support_phone', 'whatsapp',
  'address', 'city', 'country',
  'currency_code', 'currency_symbol', 'locale',
  // The second currency and who gets it. `home_country_code` decides which
  // shoppers pay the base; a blank secondary code switches the whole thing off.
  'home_country_code', 'secondary_currency_code', 'secondary_currency_symbol',
  'secondary_currency_rate',
  'announcement',
  'brand_color', 'brand_color_dark', 'accent_color', 'accent_color_dark',
  'free_shipping_threshold', 'flat_shipping_fee',
  'meta_title', 'meta_description', 'meta_keywords', 'og_image_url',
  'google_analytics_id', 'google_site_verification',
  'maintenance_message',
] as const;

const SOCIAL_FIELDS = ['facebook', 'instagram', 'x', 'tiktok'] as const;

/** Saves what this form sent, and reports back in one word. */
export async function saveSettingsAction(_prev: string | null, formData: FormData): Promise<string> {
  const payload: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    const value = formData.get(field);
    if (value !== null) payload[field] = String(value).trim();
  }

  const socials: Record<string, string> = {};
  let sawSocial = false;
  for (const field of SOCIAL_FIELDS) {
    const value = formData.get(field);
    if (value !== null) {
      sawSocial = true;
      socials[field] = String(value).trim();
    }
  }
  if (sawSocial) payload.social_links = socials;

  // A checkbox absent from the body means "off", but only for a form that
  // actually carries the switch — hence the marker the card posts with it.
  if (formData.get('maintenance_message') !== null) {
    payload.maintenance_mode = formData.get('maintenance_mode') === 'on';
  }

  if (Object.keys(payload).length === 0) return 'saved';

  try {
    await updateStoreSettings(payload);
  } catch {
    return 'error';
  }
  revalidatePath('/settings');
  revalidatePath('/onboarding');
  return 'saved';
}
