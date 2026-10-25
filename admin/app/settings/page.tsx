import Link from 'next/link';
import { CreditCard, ExternalLink, Plus } from 'lucide-react';
import { getPaymentMethods, getStoreSettings } from '@/lib/admin-api';
import { storefrontUrl } from '@/lib/storefront';
import Badge from '@/components/Badge';
import { SettingsCard } from '@/components/sellzy/settings-field';
import SettingsTabs, { type SettingsTabKey } from '@/components/sellzy/settings-tabs';
import { paymentLogoFor } from '@/lib/payment-logos';
import {
  AnnouncementCard, BrandCard, BusinessCard, CurrencyCard, DeliveryCard, MaintenanceCard, SeoCard,
} from '@/components/settings/cards';
import { saveSettingsAction } from './actions';
import StorePreview from './StorePreview';

export const dynamic = 'force-dynamic';

/* Everything about the shop itself, on one page.
 *
 * It replaces five routes — General, Shop, SEO, Payment API and Maintenance —
 * of which three edited the same fields with three separate copies of the field
 * list, so whichever was saved last won and none of them said so. Credentials
 * are deliberately not here: they live under /system, behind their own access
 * area, because editing opening hours and reading a private key are not the
 * same job.
 */

const TABS: SettingsTabKey[] = ['identity', 'storefront', 'payments', 'seo', 'maintenance'];

const SUBTITLE: Record<SettingsTabKey, string> = {
  identity: 'Name, mark, colours and how customers reach you',
  storefront: 'Currency, delivery and what the shop announces',
  payments: 'What shoppers can pay with at checkout',
  seo: 'How the store appears in search and when shared',
  maintenance: 'Take the storefront offline while you work on it',
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = (TABS.includes(sp.tab as SettingsTabKey) ? sp.tab : 'identity') as SettingsTabKey;
  const settings = await getStoreSettings().catch(() => null);

  return (
    <div className="ak-card">
      <div className="px-4 pb-1 pt-4 sm:px-6 sm:pt-6">
        <h2 className="ak-page-title">Store settings</h2>
        <p className="ak-page-sub">{SUBTITLE[tab]}</p>
      </div>
      <div className="px-4 sm:px-6">
        <SettingsTabs active={tab} />
      </div>

      <div className="p-4 sm:p-6">
        {!settings ? (
          <p className="text-sm" style={{ color: 'var(--error)' }}>
            Could not load store settings — check the API and reload.
          </p>
        ) : tab === 'identity' ? (
          /* The live preview is the one thing the old Store Setup page did
             that the settings pages did not, so it is kept — and it wraps the
             cards so it can read them as they are typed. */
          <StorePreview settings={settings}>
            <BusinessCard settings={settings} action={saveSettingsAction} />
            <BrandCard settings={settings} action={saveSettingsAction} />
          </StorePreview>
        ) : tab === 'storefront' ? (
          <div className="space-y-4 sm:space-y-6">
            <CurrencyCard settings={settings} action={saveSettingsAction} />
            <DeliveryCard settings={settings} action={saveSettingsAction} />
            <AnnouncementCard settings={settings} action={saveSettingsAction} />
          </div>
        ) : tab === 'payments' ? (
          <PaymentMethods />
        ) : tab === 'seo' ? (
          <SeoCard settings={settings} action={saveSettingsAction} />
        ) : (
          <MaintenanceCard settings={settings} action={saveSettingsAction} />
        )}
      </div>
    </div>
  );
}

/* This tab used to be called "Payment API" and held no API: a grid of invented
   providers with dead toggles, then a note saying the real keys live in
   environment variables. What a merchant wants here is the list of things a
   shopper can choose at checkout, so that is what it shows. */
async function PaymentMethods() {
  const page = await getPaymentMethods().catch(() => null);
  const methods = page?.results ?? [];

  return (
    <SettingsCard
      title="Checkout methods"
      sub="What shoppers can choose when they pay. Provider credentials are not here — see System configuration."
    >
      {page === null ? (
        <p className="text-sm" style={{ color: 'var(--error)' }}>
          Could not load the payment methods — check the API and reload.
        </p>
      ) : methods.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          None configured yet — add the first from the Payment methods page.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {methods.map((method) => {
            const logo = method.logo_url || paymentLogoFor(method.name, method.provider);
            return (
              <div key={method.id} className="flex items-start gap-3 p-4" style={{ border: '1px solid var(--border)', borderRadius: 16 }}>
                <div
                  className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <CreditCard size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-base font-semibold" style={{ color: 'var(--text-1)' }}>{method.name}</h4>
                    <Badge label={method.is_active ? 'Active' : 'Inactive'} variant={method.is_active ? 'success' : 'neutral'} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    {method.provider_label || 'Not linked to a payment integration'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href="/payment-method" className="ak-btn-primary" style={{ borderRadius: 9999 }}>
          <Plus size={13} />Manage payment methods
        </Link>
        <a href={storefrontUrl('/')} target="_blank" rel="noreferrer" className="ak-btn-secondary" style={{ borderRadius: 9999 }}>
          <ExternalLink size={13} />Open storefront
        </a>
      </div>
    </SettingsCard>
  );
}
