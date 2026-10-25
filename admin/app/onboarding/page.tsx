import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { getStoreSettings, updateStoreSettings } from '@/lib/admin-api';
import {
  AnnouncementCard, BrandCard, BusinessCard, CurrencyCard, DeliveryCard,
} from '@/components/settings/cards';
import { saveSettingsAction } from '@/app/settings/actions';
import StorePreview from '@/app/settings/StorePreview';

export const dynamic = 'force-dynamic';

/* First run: the same cards the settings page uses, in the order a new shop
 * fills them in.
 *
 * This page used to carry its own copy of every field — the third copy, after
 * General Settings and Shop Settings — so the three drifted and whichever was
 * saved last won. Composing the same components means that cannot happen
 * again: a field added to a card appears in both places, or in neither.
 */

async function finishOnboardingAction() {
  'use server';
  await updateStoreSettings({ is_onboarded: true });
  revalidatePath('/', 'layout');
}

export default async function OnboardingPage() {
  const settings = await getStoreSettings();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="ak-page-title">Store setup</h2>
        <p className="ak-page-sub">
          Brand, currency, contact and delivery — applied across the storefront and the app
        </p>
      </div>

      {settings.is_onboarded && (
        <p
          className="flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-sm"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
        >
          This store is already set up. These are the same cards as
          <Link href="/settings" className="font-semibold" style={{ color: 'var(--brand)' }}>Store settings</Link>
          — edit them in either place.
        </p>
      )}

      <StorePreview settings={settings}>
        <BusinessCard settings={settings} action={saveSettingsAction} />
        <BrandCard settings={settings} action={saveSettingsAction} />
        <CurrencyCard settings={settings} action={saveSettingsAction} />
        <DeliveryCard settings={settings} action={saveSettingsAction} />
        <AnnouncementCard settings={settings} action={saveSettingsAction} />
      </StorePreview>

      {!settings.is_onboarded && (
        <form action={finishOnboardingAction} className="flex justify-end">
          {/* Each card has already saved itself; this only marks the shop set
              up, which is what takes this page out of the menu. */}
          <button data-manage type="submit" className="ak-btn-primary" style={{ borderRadius: 9999 }}>
            <CheckCircle2 size={15} />Finish setup
          </button>
        </form>
      )}
    </div>
  );
}
