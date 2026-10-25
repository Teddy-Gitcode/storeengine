import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, Package, User } from 'lucide-react';
import {
  approveRefund, getOrder, getRefund, getStoreSettings, rejectRefund,
} from '@/lib/admin-api';
import {
  StatusPill, TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH, type PillTone,
} from '@/components/sellzy/product-ui';
import RefundDecision from './RefundDecision';

export const dynamic = 'force-dynamic';

function refundTone(status: string): PillTone {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

async function approveAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await approveRefund(id, String(formData.get('note') || ''));
  revalidatePath('/refunds');
  revalidatePath(`/refunds/${id}`);
}

async function rejectAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await rejectRefund(id, String(formData.get('note') || ''));
  revalidatePath('/refunds');
  revalidatePath(`/refunds/${id}`);
}

export default async function RefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const refund = await getRefund(id);
  if (!refund) notFound();

  const [order, settings] = await Promise.all([
    refund.order_number ? getOrder(refund.order_number) : Promise.resolve(null),
    getStoreSettings().catch(() => null),
  ]);

  const locale = settings?.locale || 'en-US';
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: refund.currency || settings?.currency_code || 'USD',
    maximumFractionDigits: 2,
  });
  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const facts = [
    { label: 'Requested Amount', value: money.format(Number(refund.amount)) },
    { label: 'Order Total', value: money.format(Number(refund.order_total)) },
    { label: 'Payment Method', value: refund.method || '—' },
    { label: 'Requested Date', value: date(refund.created_at) },
    { label: 'Payout Date', value: date(refund.resolved_at) },
    { label: 'Type', value: refund.kind_label },
    { label: 'Scope', value: refund.partial ? 'Partial' : 'Full' },
    { label: 'Restock', value: refund.restock ? 'Yes' : 'No' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Header ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/refunds"
            className="flex size-8 items-center justify-center rounded-full text-light-primary-text transition-colors hover:bg-gray-200"
            aria-label="Back to refunds"
          >
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans sm:text-xl">Details</h2>
        </div>
        <RefundDecision
          id={refund.id}
          status={refund.status}
          approveAction={approveAction}
          rejectAction={rejectAction}
        />
      </div>

      {/* ─── Refunds Information ────────────────── */}
      <div className="rounded-2xl border border-gray-500/20 bg-surface">
        <div className="flex items-center justify-between gap-4 border-b border-gray-500/20 px-4 py-4 sm:px-6">
          <h3 className="text-lg font-bold text-light-primary-text font-public-sans">Refunds Information</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-light-secondary-text font-public-sans">#{refund.id}</span>
            <StatusPill label={refund.status_label} tone={refundTone(refund.status)} />
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-light-secondary-text font-public-sans">{f.label}</dt>
                <dd className="text-sm font-bold text-light-primary-text font-public-sans">{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <p className="text-xs text-light-secondary-text font-public-sans">Reason</p>
            <p className="text-sm text-light-primary-text font-public-sans">
              {refund.reason || 'No reason was given.'}
            </p>
          </div>

          {refund.resolution_note && (
            <div className="mt-4">
              <p className="text-xs text-light-secondary-text font-public-sans">
                Resolution note{refund.resolved_by ? ` — ${refund.resolved_by}` : ''}
              </p>
              <p className="text-sm text-light-primary-text font-public-sans">{refund.resolution_note}</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Customer Information ───────────────── */}
      <div className="rounded-2xl border border-gray-500/20 bg-surface">
        <h3 className="border-b border-gray-500/20 px-4 py-4 text-lg font-bold text-light-primary-text sm:px-6 font-public-sans">
          Customer Information
        </h3>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <User size={22} className="text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-light-primary-text font-public-sans">{refund.customer || '—'}</p>
            {order?.email && <p className="text-sm text-light-secondary-text font-public-sans">{order.email}</p>}
            {order?.phone && <p className="text-sm text-light-secondary-text font-public-sans">{order.phone}</p>}
            <p className="mt-1 text-xs text-light-secondary-text font-public-sans">
              Requested by {refund.requested_by || 'the customer'} on order{' '}
              <Link href={`/orders/${refund.order_number}`} className="font-semibold text-primary">
                #{refund.order_number}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ─── Refunds Product ────────────────────── */}
      <div className="w-full rounded-2xl bg-surface">
        <div className="flex items-center justify-between gap-4 p-4 pb-4 sm:p-6">
          <h3 className="text-xl font-bold leading-7 text-light-primary-text font-public-sans">Refunds Product</h3>
          <span className="text-xs text-light-secondary-text font-public-sans">
            {refund.partial ? 'Partial refund — the amount above is what was requested' : 'Full order refund'}
          </span>
        </div>
        {!order || order.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Package size={28} className="text-gray-400" />
            <p className="text-sm font-semibold text-light-primary-text font-public-sans">
              No order lines to show
            </p>
            <p className="text-xs text-light-secondary-text font-public-sans">
              The order behind this request could not be loaded.
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={TABLE_TH}>ID</th>
                  <th className={TABLE_TH}>Product Name</th>
                  <th className={TABLE_TH}>Items</th>
                  <th className={TABLE_TH}>Amount</th>
                  <th className={TABLE_TH}>Payment status</th>
                  <th className={TABLE_TH}>Status</th>
                  <th className={TABLE_TH}>Date</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className={TABLE_ROW}>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm text-light-secondary-text`}>
                      #{item.sku || item.id}
                    </td>
                    <td className={`${TABLE_TD} text-sm text-light-secondary-text`}>{item.name}</td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm tabular-nums text-light-secondary-text`}>
                      {item.quantity} pcs
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap font-dm-sans text-sm font-semibold text-primary`}>
                      {money.format(Number(item.line_total))}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm text-light-secondary-text`}>
                      {order.payment_status}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}>
                      <StatusPill label={refund.status_label} tone={refundTone(refund.status)} />
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm text-light-secondary-text`}>
                      {date(refund.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
