'use client';

import { useActionState } from 'react';
import type { StoreSettings } from '@/lib/admin-types';
import { PillInput, PillSelect, PillTextarea, SettingsCard } from '@/components/sellzy/settings-field';
import SettingsToggle from '@/components/sellzy/settings-toggle';
import BrandImageField from './BrandImageField';
import RateField from './RateField';

/* The store's own settings, one card per subject.
 *
 * These are components rather than page markup because three screens used to
 * edit the same fields — Store Setup, General Settings and Shop Settings — each
 * with its own copy of the field list, and whichever was saved last won. None
 * of them said so. The onboarding wizard and the settings page now compose
 * these same cards, so the duplication cannot come back by drift.
 *
 * Each card saves itself. A single page-wide Save meant editing the shop's
 * phone number posted the currency, the colours and the shipping rates along
 * with it.
 */

export type SaveAction = (prev: string | null, formData: FormData) => Promise<string>;

function CardForm({
  action, children, title, sub, submitLabel = 'Save changes',
}: {
  action: SaveAction;
  children: React.ReactNode;
  title: string;
  sub?: string;
  submitLabel?: string;
}) {
  const [message, save] = useActionState(action, null);

  return (
    <form action={save}>
      <SettingsCard title={title} sub={sub}>
        {children}
        <div className="mt-5 flex items-center justify-end gap-3">
          {/* Beside the button that caused it, not at the top of a page that
              may have four other forms on it. */}
          {message === 'saved' && (
            <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>Saved</span>
          )}
          {message === 'error' && (
            <span className="text-xs font-semibold" style={{ color: 'var(--error)' }}>Save failed — try again</span>
          )}
          <button data-manage type="submit" className="ak-btn-primary" style={{ borderRadius: 9999 }}>
            {submitLabel}
          </button>
        </div>
      </SettingsCard>
    </form>
  );
}

export function BusinessCard({ settings, action }: { settings: StoreSettings; action: SaveAction }) {
  return (
    <CardForm
      action={action}
      title="Business"
      sub="The name, mark and contact details customers see across the storefront, receipts and the app."
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <PillInput label="Store name" name="business_name" defaultValue={settings.business_name} />
        <PillInput label="Tagline" name="tagline" defaultValue={settings.tagline} placeholder="e.g. Taste the heritage" />
        <div className="md:col-span-2 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <BrandImageField
            label="Logo" name="logo_url" defaultValue={settings.logo_url}
            help="Shown on the storefront, the app, receipts and emails. A wide PNG or SVG with a transparent background works best. Leave empty to show the store name."
          />
          <BrandImageField
            label="Favicon" name="favicon_url" defaultValue={settings.favicon_url} square
            help="The small square icon in browser tabs. 512×512 PNG."
          />
        </div>
        <PillInput label="Support email" name="support_email" type="email" defaultValue={settings.support_email} />
        <PillInput label="Support phone" name="support_phone" defaultValue={settings.support_phone} />
        <PillInput label="WhatsApp" name="whatsapp" defaultValue={settings.whatsapp} />
        <PillInput label="Address" name="address" defaultValue={settings.address} />
        <PillInput label="City" name="city" defaultValue={settings.city} />
        <PillInput label="Country" name="country" defaultValue={settings.country} />
      </div>
    </CardForm>
  );
}

export function BrandCard({ settings, action }: { settings: StoreSettings; action: SaveAction }) {
  const swatches = [
    { name: 'brand_color', label: 'Brand', fallback: '#0F6E56' },
    { name: 'brand_color_dark', label: 'Brand (dark)', fallback: '#085041' },
    { name: 'accent_color', label: 'Accent', fallback: '#EF9F27' },
    { name: 'accent_color_dark', label: 'Accent (dark)', fallback: '#412402' },
  ] as const;

  return (
    <CardForm
      action={action}
      title="Brand colours"
      sub="Buttons, links and accents on the storefront. The dark pair carries hover states and text on light backgrounds."
    >
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
        {swatches.map((swatch) => (
          <label key={swatch.name} className="flex flex-col gap-1.5">
            <span className="ak-field-label">{swatch.label}</span>
            <input
              name={swatch.name}
              type="color"
              defaultValue={settings[swatch.name] || swatch.fallback}
              className="ak-input h-12 w-full p-1"
              style={{ borderRadius: 9999 }}
            />
          </label>
        ))}
      </div>
    </CardForm>
  );
}

/* The currencies this store prices in, and who sees which.

   A product price is a bare number: this card decides what that number means.
   The base is the currency the catalogue is actually written in — changing it
   relabels every price without changing any of them, which is why it is a
   fixed list rather than free text.

   The second currency is optional and is what shoppers outside the home
   country are shown *and charged*, at the rate set here. Leaving its code
   blank switches it off and everyone pays the base. */
const CURRENCIES = [
  { code: 'KES', symbol: 'KSh', label: 'Kenyan shilling' },
  { code: 'USD', symbol: '$', label: 'US dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'Pound sterling' },
  { code: 'NGN', symbol: '₦', label: 'Nigerian naira' },
  { code: 'GHS', symbol: 'GH₵', label: 'Ghanaian cedi' },
  { code: 'ZAR', symbol: 'R', label: 'South African rand' },
];

export function CurrencyCard({ settings, action }: { settings: StoreSettings; action: SaveAction }) {
  return (
    <CardForm action={action} title="Currency & locale" sub="What prices mean, and who sees which currency.">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        <PillSelect label="Base currency" name="currency_code" defaultValue={settings.currency_code}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{`${c.code} — ${c.label}`}</option>
          ))}
        </PillSelect>
        <PillInput
          label="Base symbol" name="currency_symbol" defaultValue={settings.currency_symbol}
          help="What prices are written with, e.g. KSh."
        />
        <PillInput label="Locale" name="locale" defaultValue={settings.locale} help="e.g. en-KE — drives number and date formatting." />
      </div>

      <p className="mt-6 text-[13px] text-ink-muted">
        Prices are stored in the base currency. Shoppers in the home country see
        them as written and may switch to the second currency; everyone else is
        shown and charged the second currency at the rate below. Leave its code
        blank to charge everyone the base.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <PillInput
          label="Home country" name="home_country_code" defaultValue={settings.home_country_code}
          help="Two-letter code, e.g. KE. Shoppers here pay the base currency."
        />
        <PillSelect label="Second currency" name="secondary_currency_code" defaultValue={settings.secondary_currency_code ?? ''}>
          <option value="">None — everyone pays the base</option>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{`${c.code} — ${c.label}`}</option>
          ))}
        </PillSelect>
        <PillInput
          label="Second symbol" name="secondary_currency_symbol" defaultValue={settings.secondary_currency_symbol}
          help="e.g. $."
        />
        <RateField
          defaultRate={settings.secondary_currency_rate}
          baseCode={settings.currency_code}
          secondCode={settings.secondary_currency_code ?? ''}
        />
      </div>
    </CardForm>
  );
}

export function DeliveryCard({ settings, action }: { settings: StoreSettings; action: SaveAction }) {
  return (
    <CardForm action={action} title="Delivery" sub="What checkout charges, on the storefront and in the app.">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <PillInput
          label="Flat shipping fee" name="flat_shipping_fee" type="number" defaultValue={settings.flat_shipping_fee}
          help="Charged per order below the free-shipping threshold."
        />
        <PillInput
          label="Free shipping threshold" name="free_shipping_threshold" type="number" defaultValue={settings.free_shipping_threshold}
          help="Orders at or above this subtotal ship free. 0 turns free shipping off."
        />
      </div>
    </CardForm>
  );
}

export function AnnouncementCard({ settings, action }: { settings: StoreSettings; action: SaveAction }) {
  return (
    <CardForm action={action} title="Announcement & socials" sub="The bar across the top of the storefront, and where the footer links go.">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <PillInput
            label="Announcement bar" name="announcement" defaultValue={settings.announcement}
            placeholder="Free delivery on orders over …"
            help="A number in braces is celebrated — “Celebrating {48} years” counts up with a sparkle and takes turns with the free-delivery line. Clear the field to switch the bar off."
          />
        </div>
        <PillInput label="Facebook" name="facebook" defaultValue={settings.social_links?.facebook} placeholder="https://facebook.com/…" />
        <PillInput label="Instagram" name="instagram" defaultValue={settings.social_links?.instagram} placeholder="https://instagram.com/…" />
        <PillInput label="X (Twitter)" name="x" defaultValue={settings.social_links?.x} placeholder="https://x.com/…" />
        <PillInput label="TikTok" name="tiktok" defaultValue={settings.social_links?.tiktok} placeholder="https://tiktok.com/…" />
      </div>
    </CardForm>
  );
}

export function SeoCard({ settings, action }: { settings: StoreSettings; action: SaveAction }) {
  return (
    <CardForm action={action} title="Search & sharing" sub="How the store appears in search results and when a link is shared.">
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <PillInput
            label="Meta title" name="meta_title" defaultValue={settings.meta_title}
            placeholder={settings.business_name} help="Tab and search-result title. About 60 characters."
          />
          <PillInput
            label="Social image URL" name="og_image_url" defaultValue={settings.og_image_url}
            placeholder="https://…/social-card.png" help="Shown when a page is shared."
          />
        </div>
        <PillTextarea
          label="Meta description" name="meta_description" defaultValue={settings.meta_description} rows={3}
          placeholder="A short, compelling summary of your store."
          help="The snippet under your title in search results. About 155 characters."
        />
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <PillInput
            label="Meta keywords" name="meta_keywords" defaultValue={settings.meta_keywords}
            placeholder="tea, kenyan tea, gifts" help="Comma-separated. Little SEO value today, but kept for feeds."
          />
          <PillInput
            label="Google site verification" name="google_site_verification" defaultValue={settings.google_site_verification}
            help="The content value of the verification meta tag."
          />
        </div>
        <PillInput
          label="Google Analytics ID" name="google_analytics_id" defaultValue={settings.google_analytics_id}
          placeholder="G-XXXXXXX"
        />
      </div>
    </CardForm>
  );
}

export function MaintenanceCard({ settings, action }: { settings: StoreSettings; action: SaveAction }) {
  return (
    <CardForm action={action} title="Maintenance mode" sub="Take the storefront offline while you work on it. The admin stays open.">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Storefront offline</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Shoppers see the message below instead of the shop. Nothing can be bought while this is on.
            </p>
          </div>
          <div data-manage>
            <SettingsToggle name="maintenance_mode" defaultChecked={settings.maintenance_mode} label="Storefront offline" />
          </div>
        </div>
        <PillTextarea
          label="Message" name="maintenance_message" defaultValue={settings.maintenance_message} rows={3}
          placeholder="We are back shortly."
        />
      </div>
    </CardForm>
  );
}
