// Sellzy status pill — pixel match for the template's rounded status chips
// (`orders.html`, `orders__73423.html`, `refunds.html`, `transactions.html`).
// Two visual variants appear in the template: an outlined pill (used for
// payment status) and a solid/tinted pill (used for fulfillment + refund
// status). Tone → color mapping is driven by the *real* status strings the
// admin API returns (see lib/admin-types.ts), not the template's mock values.

export type PillTone = 'primary' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';

const OUTLINE: Record<PillTone, string> = {
  primary: 'border border-primary text-primary',
  warning: 'border border-warning text-warning',
  error: 'border border-error text-error',
  info: 'border border-info text-info',
  neutral: 'border border-gray-400 text-gray-600',
  purple: 'border border-[var(--purple-ink)] text-[var(--purple-ink)]',
};

const SOLID: Record<PillTone, string> = {
  primary: 'bg-primary-lighter text-primary-dark',
  warning: 'bg-warning-lighter text-warning-dark',
  error: 'bg-error-lighter text-error-dark',
  info: 'bg-info-lighter text-info-dark',
  neutral: 'bg-gray-100 text-gray-700',
  purple: 'bg-[var(--purple-light)] text-[var(--purple-ink)]',
};

export function Pill({ label, tone, solid }: { label: string; tone: PillTone; solid?: boolean }) {
  return (
    <span
      className={`px-2 py-1 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium whitespace-nowrap ${
        solid ? SOLID[tone] : `bg-transparent ${OUTLINE[tone]}`
      }`}
    >
      {label}
    </span>
  );
}

/* Tones come from lib/order-stages, which is the one table every screen reads.
   There used to be three of them here — fulfillment, order status and payment,
   each with its own opinion — so an order could be amber on the list, purple on
   the dashboard and green on the shipping page, all at once and all "correct".
   These re-exports keep the existing call sites working while there is only one
   answer behind them. */
export {
  labelize,
  paymentLabel,
  paymentTone,
  statusTone,
  statusTone as orderStatusTone,
  statusTone as fulfillmentTone,
} from '@/lib/order-stages';

export function refundTone(status: string): PillTone {
  if (status === 'approved') return 'primary';
  if (status === 'requested') return 'warning';
  if (status === 'rejected') return 'error';
  return 'neutral';
}

export function shipmentTone(status: string): PillTone {
  if (status === 'delivered') return 'primary';
  if (status === 'in_transit') return 'info';
  if (status === 'awaiting_pickup') return 'warning';
  if (status === 'failed' || status === 'returned') return 'error';
  return 'neutral';
}
