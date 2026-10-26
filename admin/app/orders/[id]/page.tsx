import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, Phone, Printer, Send } from 'lucide-react';
import { Pill } from '@/components/sellzy/order-pill';
import PipelineStrip from '@/components/orders/PipelineStrip';
import {
  getOrder, getStoreSettings, cancelOrder, refundOrder, addOrderNote,
  setOrderPayment, setOrderFulfillment, holdOrder,
} from '@/lib/admin-api';
import type { StaffNote } from '@/lib/admin-types';
import { moneyFormatter } from '@/lib/money';
import { labelize, paymentLabel, paymentTone, statusTone, stageLabel } from '@/lib/order-stages';
import OrderActions from './OrderActions';

export const dynamic = 'force-dynamic';

/* One order, arranged around the decision somebody came here to make.
 *
 * The action panel used to be the last block on the page — measured at 1764px
 * down, more than two viewports — under two tables and a customer card, beside
 * a notes form. So the page now leads with the order's state and its next
 * step, keeps the panel in a sticky column, and repeats the primary button in
 * the header where it cannot be scrolled away from.
 *
 * The three coloured tiles (order date, total items, delivery date) are gone:
 * the strip carries when each stage was reached, which is the same facts with
 * the sequence attached.
 */

function revalidateOrder(number: string) {
  revalidatePath(`/orders/${number}`);
  revalidatePath('/orders');
}

export type ActionResult = { error?: string };

/**
 * The backend's own message, or a usable fallback. `adminFetch` formats a
 * failure as `Admin API <path> failed with <status> — <detail>`, and the
 * detail is the whole point here: "this order is already delivered" tells an
 * operator what to do, "that action failed" does not.
 */
function actionError(error: unknown): ActionResult {
  const message = error instanceof Error ? error.message : '';
  const detail = message.split(' — ')[1];
  return { error: detail || 'That action failed. Refresh and try again.' };
}

async function run(number: string, fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
  } catch (error) {
    return actionError(error);
  }
  revalidateOrder(number);
  return {};
}

async function cancelOrderAction(number: string) {
  'use server';
  return run(number, () => cancelOrder(number));
}

async function refundOrderAction(number: string, restock: boolean) {
  'use server';
  return run(number, () => refundOrder(number, { restock }));
}

async function setPaymentAction(number: string, status: string) {
  'use server';
  return run(number, () => setOrderPayment(number, status));
}

async function setFulfillmentAction(
  number: string,
  status: string,
  opts?: { tracking_number?: string; carrier?: string; restock?: boolean; reason?: string; correction?: boolean },
) {
  'use server';
  return run(number, () => setOrderFulfillment(number, status, opts));
}

async function holdAction(number: string, on_hold: boolean) {
  'use server';
  return run(number, () => holdOrder(number, on_hold));
}

async function addNoteAction(formData: FormData) {
  'use server';
  const number = String(formData.get('number'));
  const text = String(formData.get('text') || '').trim();
  if (!text) return;
  await addOrderNote(number, text);
  revalidateOrder(number);
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, settings] = await Promise.all([getOrder(id), getStoreSettings().catch(() => null)]);
  if (!order) notFound();

  // Everything on this page is the order's, so it reads in what the shopper
  // was charged in. Lines are stored in the base currency; the rate the order
  // recorded brings them into the same one as the totals beneath them.
  const format = moneyFormatter(settings, 2);
  const money = (value: string | number) => format(value, order.currency);
  const rate = Number(order.fx_rate) || 1;
  const staffNotes: StaffNote[] = Array.isArray(order.metadata?.staff_notes)
    ? (order.metadata.staff_notes as StaffNote[])
    : [];

  const mailtoHref = order.email
    ? `mailto:${order.email}?subject=${encodeURIComponent(`Your order ${order.number}`)}&body=${encodeURIComponent(
        `Hello,\n\nAn update on your order ${order.number}:\n\nStatus: ${labelize(order.status)}\nTotal: ${money(order.grand_total)}\n\nThank you for shopping with us.`,
      )}`
    : null;

  const actionProps = {
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    onHold: order.on_hold,
    cancelled: Boolean(order.cancelled_at),
    allowed: order.allowed_transitions,
    currency: order.currency,
    setPaymentAction: setPaymentAction.bind(null, order.number),
    setFulfillmentAction: setFulfillmentAction.bind(null, order.number),
    refundAction: refundOrderAction.bind(null, order.number),
    cancelAction: cancelOrderAction.bind(null, order.number),
    holdAction: holdAction.bind(null, order.number),
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Sticky, so the order's state and its next step stay reachable however
          far down the items table somebody is. */}
      <div
        className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:px-5"
        style={{ background: 'color-mix(in srgb, var(--surface) 88%, transparent)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href="/orders" aria-label="Back to orders" className="ak-icon-btn" style={{ color: 'var(--text-2)' }}>
            <ArrowLeft size={18} />
          </Link>
          <h2 className="ak-page-title truncate">#{order.number}</h2>
          <Pill label={stageLabel(order.status)} tone={statusTone(order.status)} solid />
          <Pill label={paymentLabel(order.payment_status)} tone={paymentTone(order.payment_status)} />
          {order.on_hold && <Pill label="On hold" tone="warning" solid />}
        </div>
        <div data-manage className="flex items-center gap-2.5">
          <Link href={`/orders/${order.number}/invoice`} className="ak-btn-secondary" style={{ height: 30, borderRadius: 9999 }}>
            <Printer size={13} />Invoice
          </Link>
          {mailtoHref ? (
            <a href={mailtoHref} className="ak-btn-secondary" style={{ height: 30, borderRadius: 9999 }}>
              <Send size={13} />Email
            </a>
          ) : null}
          {/* The same component, the same props, the same rule — so the header
              can never offer a step the panel would refuse. */}
          <OrderActions {...actionProps} variant="bar" />
        </div>
      </div>

      <PipelineStrip status={order.status} events={order.status_events} onHold={order.on_hold} />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="space-y-4 sm:space-y-5 lg:col-span-2">
          <section className="ak-card overflow-hidden">
            <h3 className="border-b px-4 py-3.5 text-base font-bold sm:px-5" style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }}>
              Items
            </h3>
            <div className="w-full overflow-x-auto">
              <table className="ak-table w-full text-sm">
                <thead>
                  <tr>
                    {['Product', 'SKU', 'Qty', 'Price'].map((head) => (
                      <th key={head} className="whitespace-nowrap px-3 py-3 text-left text-[13px] font-semibold first:pl-5 last:pr-5">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2.5 pl-5 text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>{item.name}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[13px]" style={{ color: 'var(--text-3)' }}>{item.sku || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--text-2)' }}>{item.quantity}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 pr-5 font-dm-sans text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                        {money(Number(item.line_total) * rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="space-y-2 border-t px-4 py-4 sm:px-5" style={{ borderColor: 'var(--border)' }}>
              <SummaryRow label="Sub-total" value={money(order.subtotal)} />
              <SummaryRow label="Shipping" value={money(order.shipping_total)} />
              <SummaryRow label="Discount" value={`−${money(order.discount_total)}`} />
              <SummaryRow label="Tax" value={money(order.tax_total)} />
              <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                <dt className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Total</dt>
                <dd className="font-dm-sans text-base font-bold" style={{ color: 'var(--text-1)' }}>{money(order.grand_total)}</dd>
              </div>
              <p className="pt-1 text-xs" style={{ color: 'var(--text-3)' }}>
                Paid by {order.payment_method === 'cod' ? 'cash on delivery' : labelize(order.payment_method || 'prepaid').toLowerCase()}
              </p>
            </dl>
          </section>

          <section className="ak-card p-4 sm:p-5">
            <h3 className="mb-3 text-base font-bold" style={{ color: 'var(--text-1)' }}>Customer</h3>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{order.email || 'Guest checkout'}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
              {order.email && <Fact icon={Mail}>{order.email}</Fact>}
              {order.phone && <Fact icon={Phone}>{order.phone}</Fact>}
              {(order.shipping_city || order.shipping_country) && (
                <Fact icon={MapPin}>{[order.shipping_city, order.shipping_country].filter(Boolean).join(', ')}</Fact>
              )}
              {!order.email && !order.phone && <Fact icon={MapPin}>No contact details on this order.</Fact>}
            </div>
          </section>

          <section className="ak-card p-4 sm:p-5">
            <h3 className="mb-3 text-base font-bold" style={{ color: 'var(--text-1)' }}>Notes</h3>
            <div className="space-y-2.5">
              {order.notes && (
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-1)' }}>Customer note: </span>{order.notes}
                </p>
              )}
              {staffNotes.map((note, i) => (
                <div key={i} className="rounded-lg px-3 py-2" style={{ background: 'var(--surface-2)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-1)' }}>{note.text}</p>
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {note.author || 'Staff'} · {note.at ? new Date(note.at).toLocaleString('en-GB') : ''}
                  </p>
                </div>
              ))}
              {!order.notes && staffNotes.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>No notes yet.</p>
              )}
            </div>
            <form data-manage action={addNoteAction} className="pt-3">
              <input type="hidden" name="number" value={order.number} />
              <textarea
                name="text"
                required
                placeholder="Add a note visible only to staff…"
                rows={2}
                className="ak-input w-full"
                style={{ borderRadius: 16, padding: '12px 16px', height: 'auto', resize: 'vertical' }}
              />
              <div className="mt-2 flex justify-end">
                <button type="submit" className="ak-btn-primary" style={{ height: 30, borderRadius: 9999 }}>
                  <Send size={12} />Add note
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Payment, fulfilment, hold, cancel and refund — orders: manage only. */}
        <div id="act" data-manage className="lg:col-span-1">
          <div className="ak-card p-4 sm:p-5 lg:sticky lg:top-[68px]">
            <OrderActions {...actionProps} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</dt>
      <dd className="font-dm-sans text-sm" style={{ color: 'var(--text-2)' }}>{value}</dd>
    </div>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
      <Icon size={14} className="shrink-0" style={{ color: 'var(--text-3)' }} />
      {children}
    </span>
  );
}
