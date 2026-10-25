import { Clock, Package, Truck, CheckCircle2, PauseCircle, XCircle, RotateCcw, Undo2 } from 'lucide-react';
import type { AdminOrder } from '@/lib/admin-types';

/* The vocabulary every order screen speaks.
 *
 * The backend keeps two axes and six forward fulfillment states because the
 * warehouse needs "packed" apart from "processing". A person reading an order
 * list does not, so this collapses them to four stages and keeps the finer
 * distinction as a sub-state underneath.
 *
 * It exists because the same order used to be described four different ways:
 * "Received status" on the list, "Order Tracking" on the detail page, "To
 * Pack" in the nav, and a different pill component with a different palette on
 * the dashboard, the refunds list and the shipping page. One order, four
 * vocabularies, and no way to tell whether two screens disagreed about a fact
 * or only about a word.
 *
 * Mirrors ORDER_STAGES in backend/apps/orders/views.py, which is what the
 * counts are computed from. Keep the two in step.
 */

export type StageKey = 'pending' | 'processing' | 'shipped' | 'delivered';
export type Tone = 'warning' | 'info' | 'purple' | 'primary' | 'error' | 'neutral';

export type Stage = {
  key: StageKey;
  label: string;
  /** What is true of an order here, and what it is waiting for. */
  hint: string;
  icon: typeof Clock;
  tone: Tone;
  /** Derived `status` values this stage covers, for the ?status= filter. */
  statuses: string[];
  /** The queue page that works this stage, when a person works it. */
  queue?: { href: string; label: string };
};

export const STAGES: Stage[] = [
  {
    key: 'pending',
    label: 'Pending',
    hint: 'Waiting on payment, or paid and not yet picked.',
    icon: Clock,
    tone: 'warning',
    statuses: ['pending_payment', 'paid'],
    queue: { href: '/finance-queue', label: 'Payments to verify' },
  },
  {
    key: 'processing',
    label: 'Processing',
    hint: 'Being picked and boxed.',
    icon: Package,
    tone: 'purple',
    statuses: ['processing', 'packed'],
    queue: { href: '/warehouse', label: 'To pack' },
  },
  {
    key: 'shipped',
    label: 'Shipped',
    hint: 'With the courier.',
    icon: Truck,
    tone: 'info',
    statuses: ['shipped'],
    queue: { href: '/in-transit', label: 'In transit' },
  },
  {
    key: 'delivered',
    label: 'Delivered',
    hint: 'Complete.',
    icon: CheckCircle2,
    tone: 'primary',
    statuses: ['delivered'],
  },
];

/* Off the forward path. These are things that happened to an order, not places
   it has reached, so they are never a fifth stage — they are a side rail, and
   a held order still shows the stage it stopped at. */
export const EXCEPTIONS = [
  { key: 'on_hold', label: 'On hold', icon: PauseCircle, tone: 'warning' as Tone, href: '/orders?exception=on_hold' },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle, tone: 'error' as Tone, href: '/orders?status=cancelled' },
  { key: 'refunded', label: 'Refunded', icon: RotateCcw, tone: 'purple' as Tone, href: '/orders?status=refunded' },
  { key: 'returned', label: 'Returned', icon: Undo2, tone: 'error' as Tone, href: '/orders?exception=returned' },
];

export type StageCounts = {
  stages: Record<StageKey, number>;
  queues: Record<string, number>;
  exceptions: Record<string, number>;
  total: number;
};

const BY_STATUS = new Map<string, Stage>(
  STAGES.flatMap((stage) => stage.statuses.map((status) => [status, stage] as const)),
);

export function stageFor(status: string): Stage | undefined {
  return BY_STATUS.get(status);
}

export function stageIndex(status: string): number {
  return STAGES.findIndex((s) => s.statuses.includes(status));
}

/** True when an order has left the forward path and the strip should stop. */
export function isTerminal(status: string): boolean {
  return status === 'cancelled' || status === 'refunded' || status === 'returned';
}

/** The finer state under the stage — what a warehouse would call it. Empty
 *  when the stage says everything there is to say. */
export function subState(order: Pick<AdminOrder, 'status' | 'fulfillment_status' | 'payment_status'>): string {
  if (order.status === 'paid') return 'Paid, not yet picked';
  if (order.status === 'packed') return 'Packed, awaiting courier';
  if (order.status === 'pending_payment') {
    return order.payment_status === 'due_on_delivery' ? 'Cash on delivery' : 'Awaiting payment';
  }
  return '';
}

export function labelize(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** An order's fulfilment status as a stage pill. "paid" is the one status
 *  named after money: shown as-is it sat beside a "Paid" payment pill and
 *  said the same thing twice, so it is named for what happens next. */
export function stageLabel(status: string): string {
  return status === 'paid' ? 'Ready to pick' : labelize(status);
}

/** Payment, said the way the queues already say it: cash on delivery is not
 *  something anyone has to chase, so it must not read as "Pending". */
export function paymentLabel(status: string): string {
  if (status === 'due_on_delivery') return 'On delivery';
  return labelize(status);
}

export function paymentTone(status: string): Tone {
  if (status === 'paid') return 'primary';
  if (status === 'due_on_delivery') return 'info';
  if (status === 'pending') return 'warning';
  if (status === 'failed') return 'error';
  if (status === 'refunded' || status === 'partially_refunded') return 'purple';
  return 'neutral';
}

/** The tone for a derived order status — the one table every screen reads, so
 *  an order cannot be amber on one page and purple on the next. */
export function statusTone(status: string): Tone {
  if (status === 'cancelled' || status === 'returned') return 'error';
  if (status === 'refunded') return 'purple';
  return stageFor(status)?.tone ?? 'neutral';
}

/* ── Timing ──────────────────────────────────────────────────────────────── */

/** How long a stage should take before the strip flags it. Soft: it colours a
 *  row, it does not block anything. */
export const SLA: Record<string, number> = {
  pending_payment: 48 * 3600e3,
  paid: 12 * 3600e3,
  processing: 24 * 3600e3,
  packed: 24 * 3600e3,
  shipped: 7 * 24 * 3600e3,
};

export function formatDuration(ms: number): string {
  const safe = Math.max(ms, 0);
  const mins = Math.floor(safe / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

/** First time the order entered each status, from its own event log. */
export function enteredAt(events: { to_status: string; created_at: string }[]): Record<string, string> {
  const entered: Record<string, string> = {};
  for (const event of [...events].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))) {
    if (entered[event.to_status] == null) entered[event.to_status] = event.created_at;
  }
  return entered;
}

/** How long this order has sat where it is, and whether that is too long. */
export function dwell(
  status: string,
  entered: Record<string, string>,
  now = Date.now(),
): { text: string; overSla: boolean } | null {
  const at = entered[status];
  if (!at) return null;
  const ms = now - +new Date(at);
  const limit = SLA[status];
  return { text: formatDuration(ms), overSla: limit != null && ms > limit };
}
