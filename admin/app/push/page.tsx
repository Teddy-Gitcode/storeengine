import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  Smartphone,
  Users,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import Badge, { type BadgeVariant } from '@/components/Badge';
import {
  deletePushCampaign,
  duplicatePushCampaign,
  getCategories,
  getProducts,
  getPushCampaigns,
  getPushOverview,
  getStoreSettings,
  sendPushCampaign,
} from '@/lib/admin-api';
import type { PushCampaign } from '@/lib/admin-types';
import PushComposer, { type LinkTarget } from './PushComposer';
import CampaignActions from './CampaignActions';
import LocalTime from './LocalTime';

export const dynamic = 'force-dynamic';

async function sendAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  try {
    await sendPushCampaign(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send.';
    redirect(`/push?error=${encodeURIComponent(message)}`);
  }
  revalidatePath('/push');
  redirect('/push?sent=1');
}

async function deleteAction(formData: FormData) {
  'use server';
  await deletePushCampaign(Number(formData.get('id')));
  revalidatePath('/push');
}

async function duplicateAction(formData: FormData) {
  'use server';
  await duplicatePushCampaign(Number(formData.get('id')));
  revalidatePath('/push');
}

function statusVariant(status: PushCampaign['status']): BadgeVariant {
  if (status === 'sent') return 'success';
  if (status === 'scheduled') return 'info';
  if (status === 'sending') return 'gold';
  if (status === 'failed') return 'error';
  return 'neutral';
}

export default async function PushPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const [overview, campaigns, settings, categories, products] = await Promise.all([
    getPushOverview().catch(() => null),
    getPushCampaigns().then((p) => p.results).catch(() => [] as PushCampaign[]),
    getStoreSettings().catch(() => null),
    getCategories({ page_size: 200 }).then((p) => p.results).catch(() => []),
    getProducts({ status: 'active', page_size: 200 }).then((p) => p.results).catch(() => []),
  ]);

  // What a notification can open, each with the picture it could borrow.
  // Products go by slug: that is what the app's /product/:slug route reads.
  const linkTargets: LinkTarget[] = [
    ...categories
      .filter((c) => c.is_active)
      .map((c) => ({ group: 'Categories', label: c.name, path: `/category/${c.slug}`, image: c.image_url || '' })),
    ...products
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => {
        const photo = p.images.find((i) => i.is_primary) ?? p.images[0];
        return { group: 'Products', label: p.name, path: `/product/${p.slug}`, image: photo?.url || '' };
      }),
  ];

  if (!overview) {
    return (
      <div className="ak-card p-6">
        <p className="text-sm" style={{ color: 'var(--error)' }}>
          Could not load push notifications — check the API and reload.
        </p>
      </div>
    );
  }

  const sentCount = campaigns.filter((c) => c.status === 'sent').length;
  const scheduledCount = campaigns.filter((c) => c.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="ak-page-title">Push Notifications</h2>
          <p className="ak-page-sub">
            Send a message straight to the phones of people who have your app installed.
          </p>
        </div>
      </div>

      {!overview.configured && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl" style={{ border: '1px solid var(--gold-border)', background: 'var(--gold-light)' }}>
          <AlertTriangle size={16} style={{ color: '#865308', marginTop: 2 }} />
          <div className="text-sm" style={{ color: '#865308' }}>
            <strong className="font-semibold">Push isn&apos;t switched on yet.</strong>{' '}
            You can write and save campaigns, but nothing will send until the Firebase
            service-account JSON is pasted on the{' '}
            <Link href="/firebase" className="underline font-semibold">Firebase Configuration</Link>{' '}
            page.
          </div>
        </div>
      )}

      {sp.sent && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ border: '1px solid var(--green-border)', background: 'var(--green-light)' }}>
          <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>
            Sent — the delivery counts update in a moment.
          </span>
        </div>
      )}
      {sp.error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ border: '1px solid var(--error)', background: 'var(--red-light, #fef2f2)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--error)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--error)' }}>{sp.error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Reachable devices" value={String(overview.devices.active)} sub="Allow notifications" trend="neutral" icon={Smartphone} accent="blue" />
        <StatCard label="Signed in" value={String(overview.devices.signed_in)} sub="Can be targeted by history" trend="neutral" icon={Users} accent="green" />
        <StatCard label="Campaigns sent" value={String(sentCount)} sub="All time" trend="neutral" icon={BellRing} accent="purple" />
        <StatCard label="Scheduled" value={String(scheduledCount)} sub="Waiting to go out" trend="neutral" icon={Clock} accent="gold" />
      </div>

      <PushComposer overview={overview} storeName={settings?.business_name || 'Your store'} linkTargets={linkTargets} />

      <section className="ak-card p-4">
        <h3 className="mb-3 font-semibold" style={{ color: 'var(--text-1)' }}>Campaigns</h3>
        {campaigns.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Nothing yet. Pick a template above to write your first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr style={{ color: 'var(--text-3)' }} className="text-left text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 font-semibold">Campaign</th>
                  <th className="px-3 py-2 font-semibold">Audience</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Schedule</th>
                  <th className="px-3 py-2 font-semibold">Delivered</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{c.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-3)' }}>{c.title}</div>
                      {c.link && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                          opens <code>{c.link}</code>
                        </div>
                      )}
                      {c.error && (
                        <div className="text-xs mt-1" style={{ color: 'var(--error)' }}>{c.error}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top" style={{ color: 'var(--text-2)' }}>
                      {c.audience_label}
                      <div className="text-xs" style={{ color: 'var(--text-3)' }}>{c.reach} device{c.reach === 1 ? '' : 's'} now</div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Badge variant={statusVariant(c.status)} label={c.status_label} />
                    </td>
                    <td className="px-3 py-3 align-top text-xs" style={{ color: 'var(--text-2)' }}>
                      <LocalTime iso={c.scheduled_for} />
                      {c.repeat !== 'once' && (
                        <div style={{ color: 'var(--text-3)' }}>repeats {c.repeat}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-xs" style={{ color: 'var(--text-2)' }}>
                      {c.last_sent_at ? (
                        <>
                          {c.sent_count}/{c.recipients}
                          {c.failed_count > 0 && (
                            <div style={{ color: 'var(--error)' }}>{c.failed_count} failed</div>
                          )}
                          <div style={{ color: 'var(--text-3)' }}><LocalTime iso={c.last_sent_at} /></div>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <CampaignActions
                        id={c.id}
                        name={c.name}
                        reach={c.reach}
                        configured={overview.configured}
                        sendAction={sendAction}
                        duplicateAction={duplicateAction}
                        deleteAction={deleteAction}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
