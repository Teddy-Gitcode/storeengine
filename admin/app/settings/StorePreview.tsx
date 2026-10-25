'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { StoreSettings } from '@/lib/admin-types';
import { storefrontUrl } from '@/lib/storefront';

/* What the shop looks like with these settings, beside the form that sets them.
 *
 * Kept from the old Store Setup page, which is the one thing that page did that
 * the settings pages did not. It reads the live form rather than the saved
 * values, so a colour can be judged before it is committed — an input event on
 * the surrounding form is enough, no wiring per field.
 */
export default function StorePreview({
  settings,
  children,
}: {
  settings: StoreSettings;
  /** The cards being edited. They live inside this component so one `input`
   *  listener on the wrapper sees every field, instead of each one having to
   *  be lifted into state and controlled. */
  children: React.ReactNode;
}) {
  const [live, setLive] = useState({
    name: settings.business_name,
    tagline: settings.tagline,
    logo: settings.logo_url,
    announcement: settings.announcement,
    brand: settings.brand_color || '#0F6E56',
    brandDark: settings.brand_color_dark || '#085041',
    accent: settings.accent_color || '#EF9F27',
    accentDark: settings.accent_color_dark || '#412402',
  });

  // One listener on the card column, rather than controlled inputs everywhere:
  // the fields stay uncontrolled and keep posting themselves normally.
  function readForms(event: React.FormEvent<HTMLElement>) {
    const target = event.target as HTMLInputElement;
    const map: Record<string, keyof typeof live> = {
      business_name: 'name',
      tagline: 'tagline',
      logo_url: 'logo',
      announcement: 'announcement',
      brand_color: 'brand',
      brand_color_dark: 'brandDark',
      accent_color: 'accent',
      accent_color_dark: 'accentDark',
    };
    const key = map[target.name];
    if (key) setLive((current) => ({ ...current, [key]: target.value }));
  }

  return (
    <div onInput={readForms} className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4 sm:space-y-6">{children}</div>
      <aside className="h-fit space-y-3 lg:sticky lg:top-[78px]">
      <p className="ak-field-label">Live preview</p>
      <div className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <div className="px-3 py-2 text-center text-[11px] font-medium text-white" style={{ background: live.brand }}>
          {live.announcement.replace(/\{(\d{1,4})\}/, '✨ $1') || 'Your announcement bar'}
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ background: 'var(--surface)' }}>
          {live.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={live.logo} alt={live.name} className="h-7 w-auto object-contain" />
          ) : (
            <span className="text-lg font-extrabold tracking-tight" style={{ color: live.brandDark }}>
              {live.name || 'My Store'}
            </span>
          )}
          <span className="rounded-md px-3 py-1.5 text-xs font-bold" style={{ background: live.accent, color: live.accentDark }}>
            Shop now
          </span>
        </div>
        <div className="space-y-3 px-4 py-5" style={{ background: 'var(--surface-2)' }}>
          <div className="h-24 rounded-lg" style={{ background: `linear-gradient(135deg, ${live.brand}, ${live.brandDark})` }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
            {live.tagline || 'Your tagline goes here'}
          </p>
          <div className="flex gap-2">
            <span className="rounded-md px-3 py-1.5 text-xs font-semibold text-white" style={{ background: live.brand }}>Primary</span>
            <span className="rounded-md px-3 py-1.5 text-xs font-bold" style={{ background: live.accent, color: live.accentDark }}>Accent</span>
          </div>
        </div>
      </div>
      <a href={storefrontUrl('/')} target="_blank" rel="noreferrer" className="ak-btn-secondary w-full justify-center">
        <ExternalLink size={13} /> Open storefront
      </a>
      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Saving reaches the live storefront within about a minute. Colours, name, announcement,
          currency and contact details all read from here.
        </p>
      </aside>
    </div>
  );
}
