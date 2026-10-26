import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { Search } from 'lucide-react';
import OrderSelect from '@/components/sellzy/order-select';
import OrderPagination from '@/components/sellzy/order-pagination';
import OrderExportButton from '@/components/sellzy/order-export-button';
import PipelineStrip from '@/components/orders/PipelineStrip';
import { Pill } from '@/components/sellzy/order-pill';
import { countryName } from '@/lib/countries';
import Flag from '@/components/Flag';
import {
  getOrders, getOrderStageCounts, getStoreSettings, setOrderFulfillment, setOrderPayment,
} from '@/lib/admin-api';
import { dateFormatter, moneyFormatter } from '@/lib/money';
import {
  STAGES, dwell, enteredAt, labelize, paymentLabel, paymentTone, statusTone, subState, stageLabel,
} from '@/lib/order-stages';
import QuickAction, { type Step } from './QuickAction';

export const dynamic = 'force-dynamic';

/* The order list, led by the pipeline it belongs to.
 *
 * What used to be here: nine stat tiles and a full-height revenue chart, which
 * pushed the table itself a whole viewport below the fold — measured at 1069px
 * down on a 1366×768 laptop. The revenue chart already exists on
 * /sales-reports, where somebody looking for revenue would go. This page is for
 * working orders, so it leads with the four stages and puts the table where a
 * table belongs.
 */

const PAYMENT_OPTIONS = [
  { value: '', label: 'Any payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'due_on_delivery', label: 'On delivery' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const STAGE_OPTIONS = [
  { value: '', label: 'All stages' },
  ...STAGES.map((s) => ({ value: s.key, label: s.label })),
];

/** The obvious next move for an order, but only when the backend's guard has
 *  already agreed it is legal. `allowed_transitions` is computed per order by
 *  `check_transition`, so nothing here re-derives a rule. */
function nextStep(order: {
  fulfillment_status: string;
  payment_status: string;
  allowed_transitions: { fulfillment: string[] };
}): Step | null {
  const allowed = order.allowed_transitions?.fulfillment ?? [];
  if (['pending', 'failed'].includes(order.payment_status)) {
    return { to: 'paid', label: 'Mark paid', kind: 'payment' };
  }
  if (allowed.includes('processing')) return { to: 'processing', label: 'Start picking', kind: 'fulfillment' };
  if (allowed.includes('packed')) return { to: 'packed', label: 'Mark packed', kind: 'fulfillment' };
  if (allowed.includes('shipped')) return { to: 'shipped', label: 'Ship order', kind: 'fulfillment', needsInput: true };
  if (allowed.includes('delivered')) return { to: 'delivered', label: 'Mark delivered', kind: 'fulfillment' };
  return null;
}

async function quickMoveAction(number: string, to: string, kind: 'fulfillment' | 'payment') {
  'use server';
  try {
    if (kind === 'payment') await setOrderPayment(number, to);
    else await setOrderFulfillment(number, to);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return { error: message.split(' — ')[1] || 'That move was refused.' };
  }
  revalidatePath('/orders');
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; stage?: string; payment?: string; exception?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || '';
  const pageNum = parseInt(sp.page || '1', 10) || 1;
  const pageSize = 20;

  // A stage covers more than one backend status, so filtering by stage means
  // filtering by each of them. The API takes one, so a multi-status stage is
  // narrowed here after the fetch rather than pretending the API can do it.
  const stage = STAGES.find((s) => s.key === sp.stage);
  const status = sp.status || (stage && stage.statuses.length === 1 ? stage.statuses[0] : '');

  const [tablePage, counts, settings] = await Promise.all([
    getOrders({ q, status, page: String(pageNum), page_size: pageSize }),
    getOrderStageCounts().catch(() => null),
    getStoreSettings().catch(() => null),
  ]);

  let orders = tablePage.results;
  if (stage) orders = orders.filter((o) => stage.statuses.includes(o.status));
  if (sp.payment) orders = orders.filter((o) => o.payment_status === sp.payment);
  if (sp.exception === 'on_hold') orders = orders.filter((o) => o.on_hold);
  if (sp.exception === 'returned') orders = orders.filter((o) => o.fulfillment_status === 'returned');

  const money = moneyFormatter(settings);
  const date = dateFormatter(settings);
  const now = Date.now();

  const totalPages = Math.max(1, Math.ceil(tablePage.count / pageSize));
  const href = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, stage: sp.stage, payment: sp.payment, exception: sp.exception })) {
      if (value) params.set(key, value);
    }
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    return query ? `/orders?${query}` : '/orders';
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ak-page-title">All Orders</h2>
          <p className="ak-page-sub">
            {counts ? `${counts.total} orders, across four stages` : 'Every order, at every stage'}
          </p>
        </div>
        <OrderExportButton
          filename="orders.csv"
          headers={['Order', 'Email', 'Country', 'City', 'Units', 'Amount', 'Payment', 'Stage', 'Date']}
          rows={orders.map((o) => [
            o.number, o.email, countryName(o.shipping_country) || o.shipping_country, o.shipping_city,
            o.items.reduce((n, i) => n + i.quantity, 0), o.grand_total,
            paymentLabel(o.payment_status), labelize(o.status), o.placed_at || o.created_at,
          ])}
        />
      </div>

      {counts && <PipelineStrip counts={counts} />}

      <div className="ak-card">
        <form method="GET" action="/orders" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-[300px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Order number, email, phone…"
              className="ak-input w-full"
              style={{ height: 38, borderRadius: 9999, paddingLeft: 36 }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <OrderSelect name="stage" defaultValue={sp.stage || ''} options={STAGE_OPTIONS} className="min-w-[132px]" />
            <OrderSelect name="payment" defaultValue={sp.payment || ''} options={PAYMENT_OPTIONS} className="min-w-[132px]" />
            <button type="submit" className="ak-btn-secondary" style={{ height: 38, borderRadius: 9999 }}>
              Search
            </button>
          </div>
        </form>

        <div className="relative w-full overflow-x-auto">
          <table className="ak-table w-full text-sm">
            <thead>
              <tr>
                {['Order', 'Customer', 'Amount', 'Stage', 'Payment', 'Next'].map((head, i) => (
                  <th key={head || i} className="whitespace-nowrap px-3 py-3 text-left text-[13px] font-semibold first:pl-5 last:pr-5">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const units = order.items.reduce((n, item) => n + item.quantity, 0);
                const timing = dwell(order.status, enteredAt(order.status_events ?? []), now);
                const sub = subState(order);
                return (
                  <tr
                    key={order.id}
                    style={{
                      // A row that has sat too long says so on its edge, and a
                      // held one is tinted — both are things you want to see
                      // while scanning, not after opening the order.
                      borderLeft: `3px solid ${timing?.overSla ? 'var(--error)' : 'transparent'}`,
                      background: order.on_hold ? 'var(--gold-light)' : undefined,
                    }}
                  >
                    <td className="whitespace-nowrap px-3 py-3 pl-5">
                      <Link href={`/orders/${order.number}`} className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                        #{order.number}
                      </Link>
                      <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>
                        {date(order.placed_at || order.created_at)}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate whitespace-nowrap px-3 py-3 text-[13px]" style={{ color: 'var(--text-2)' }} title={order.email || undefined}>
                      {order.email || 'Guest'}
                      {/* Where it goes, under who it's for — its own column pushed
                          the Next button off the edge of a laptop screen. */}
                      <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-3)' }} title={countryName(order.shipping_country) || 'No shipping address'}>
                        <Flag code={order.shipping_country} />
                        {order.shipping_city || countryName(order.shipping_country) || 'No address'}
                        {order.phone && <> · {order.phone}</>}
                      </span>
                    </td>
                    {/* Units, not lines. The queue pages already counted units;
                        this column counted rows and called them "pcs", so the
                        same order read 3 here and 7 there. */}
                    <td className="whitespace-nowrap px-3 py-3 font-dm-sans text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                      {money(order.grand_total, order.currency)}
                      <span className="block font-public-sans text-[11px] font-normal tabular-nums" style={{ color: 'var(--text-3)' }}>
                        {units} unit{units === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Pill label={stageLabel(order.status)} tone={statusTone(order.status)} solid />
                      {sub && <span className="block text-[11px]" style={{ color: 'var(--text-3)' }}>{sub}</span>}
                      {timing?.overSla && (
                        <span className="block text-[11px] font-semibold" style={{ color: 'var(--error)' }}>
                          {timing.text} here
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Pill label={paymentLabel(order.payment_status)} tone={paymentTone(order.payment_status)} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 pr-5">
                      <QuickAction number={order.number} step={nextStep(order)} action={quickMoveAction} />
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="ak-empty py-12 text-center text-sm">
                    No orders match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 sm:px-5" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
            Showing {orders.length} of {tablePage.count}
          </span>
          <OrderPagination page={pageNum} totalPages={totalPages} makeHref={href} />
        </div>
      </div>
    </div>
  );
}
