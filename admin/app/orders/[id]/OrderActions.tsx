'use client';

import { useEffect, useState, useTransition } from 'react';
import { ArrowRight, ChevronDown, CreditCard, PauseCircle, PlayCircle, RefreshCcw, Truck, Undo2, X } from 'lucide-react';
import { FloatingSelect, FloatingTextarea, PillButton } from '@/components/sellzy/product-ui';
import { labelize } from '@/lib/order-stages';

/**
 * What can be done to this order, in three tiers of decreasing ordinariness.
 *
 * The rules are not here and never were: `allowed_transitions` is computed per
 * order by the backend's own guard (`check_transition`), so a button is only
 * offered when the guard has already agreed, and a move that is off the table
 * shows the guard's own sentence rather than a reason this screen inferred.
 *
 * What changed is the arrangement. Everything used to sit at one visual weight
 * in a column below two tables — "Cancel order" as prominent as "Mark packed",
 * with a free-choice stage dropdown beside them. Now there is one primary
 * button for the step this order is actually waiting for, the payment gate
 * when it applies, and everything destructive or rare folded away behind a
 * disclosure.
 */

type Confirmation = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  restock?: { label: string; initial: boolean };
  run: (restock: boolean) => Promise<ActionResult>;
};

type FulfillOpts = {
  tracking_number?: string;
  carrier?: string;
  restock?: boolean;
  reason?: string;
  correction?: boolean;
};
type ActionResult = { error?: string } | void;

const NEXT_STEP: Record<string, { to: string; label: string; hint: string; ship?: boolean }> = {
  unfulfilled: { to: 'processing', label: 'Start picking', hint: 'The goods have not been touched yet.' },
  processing: { to: 'packed', label: 'Mark packed', hint: 'Pick the items, then mark it packed.' },
  packed: { to: 'shipped', label: 'Add tracking & ship', hint: 'Ready for handoff to the courier.', ship: true },
  shipped: { to: 'delivered', label: 'Mark delivered', hint: 'In transit. Confirm when it arrives.' },
};

export type AllowedTransitions = {
  fulfillment: string[];
  blocked: Record<string, string>;
  corrections: string[];
  can_cancel: boolean;
  cancel_blocked: string;
  can_refund: boolean;
  refund_blocked: string;
  refundable: string;
};

type Props = {
  paymentStatus: string;
  fulfillmentStatus: string;
  onHold: boolean;
  cancelled: boolean;
  allowed: AllowedTransitions;
  currency: string;
  setPaymentAction: (status: string) => Promise<ActionResult>;
  setFulfillmentAction: (status: string, opts?: FulfillOpts) => Promise<ActionResult>;
  refundAction: (restock: boolean) => Promise<ActionResult>;
  cancelAction: () => Promise<ActionResult>;
  holdAction: (onHold: boolean) => Promise<ActionResult>;
  /** `bar` renders only the primary step, for the sticky page header. Same
   *  props, same rule — the two cannot offer different things. */
  variant?: 'panel' | 'bar';
};

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 bg-primary text-white hover:bg-primary-dark';
const secondaryBtn =
  'inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 text-gray-700 text-sm font-bold transition-colors hover:bg-gray-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 h-10';
const dangerBtn =
  'inline-flex w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 h-10 ring ring-[rgba(255,72,66,0.48)] text-error hover:bg-error-lighter/40';
const inputCls =
  'w-full rounded-full border-none bg-gray-100 px-4 text-sm ring ring-gray-500/20 focus:outline-none focus:ring-primary h-9 font-public-sans';

export default function OrderActions(props: Props) {
  const {
    paymentStatus, fulfillmentStatus, onHold, cancelled, allowed, currency,
    setPaymentAction, setFulfillmentAction, refundAction, cancelAction, holdAction,
    variant = 'panel',
  } = props;

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [fixOpen, setFixOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  /* The header's copy of the next step only shows once the Next Step panel
     (#act) has scrolled out of view — never two of the same button on screen.
     Starts "visible" so the copy doesn't flash in before the observer runs. */
  const [panelInView, setPanelInView] = useState(true);
  useEffect(() => {
    if (variant !== 'bar') return;
    const panel = document.getElementById('act');
    if (!panel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setPanelInView(entry.isIntersecting), {
      // The sticky header covers the top ~70px; a panel hidden under it is not in view.
      rootMargin: '-72px 0px 0px 0px',
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [variant]);

  const targets = allowed.fulfillment;
  const suggested = NEXT_STEP[fulfillmentStatus];
  const next = suggested && targets.includes(suggested.to) ? suggested : undefined;
  const canMarkPaid =
    !cancelled && ['pending', 'failed', 'due_on_delivery'].includes(paymentStatus);
  // Anything legal that is not the obvious next step — a store pickup skipping
  // straight to Delivered, say. Rare, so it lives with the rest of the rare
  // things rather than in a dropdown beside the ordinary one.
  const skips = targets.filter((to) => to !== next?.to && to !== 'returned');

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && 'error' in result && result.error) {
        setError(result.error);
        return;
      }
      setShipOpen(false);
      setFixOpen(false);
      setConfirm(null);
    });
  }

  function confirmMove(to: string) {
    if (to === 'returned') {
      setConfirm({
        title: 'Mark this order returned?',
        body: 'The goods have come back. Returned is off the forward path — the order cannot be moved on afterwards.',
        confirmLabel: 'Mark returned',
        restock: { label: 'Put the items back into stock', initial: true },
        run: (restock) => setFulfillmentAction('returned', { restock }),
      });
      return;
    }
    setConfirm({
      title: `Move fulfillment to "${labelize(to)}"?`,
      body: 'Fulfillment only moves forward. Correcting it afterwards is recorded as a mistake.',
      confirmLabel: `Move to ${labelize(to)}`,
      run: () => setFulfillmentAction(to),
    });
  }

  /* ── The sticky header's copy of the primary step ──────────────────────── */
  if (variant === 'bar') {
    if (!next || panelInView) return null;
    if (next.ship) {
      // Needs typing, and the header is not where a waybill gets filled in.
      return (
        <a href="#act" className={`${primaryBtn} h-[30px] px-4 text-[13px]`}>
          <Truck size={13} />{next.label}
        </a>
      );
    }
    return (
      <button
        type="button"
        className={`${primaryBtn} h-[30px] px-4 text-[13px]`}
        disabled={pending}
        onClick={() => run(() => setFulfillmentAction(next.to))}
      >
        <ArrowRight size={13} />{pending ? 'Working…' : next.label}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Tier 1: the step this order is waiting for ────────────────── */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          Next step
        </h4>
        {next ? (
          next.ship && shipOpen ? (
            <div className="space-y-2 rounded-xl border border-gray-200 p-3">
              <input className={inputCls} placeholder="Tracking number (optional)" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
              <input className={inputCls} placeholder="Carrier, e.g. DHL (optional)" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
              <button
                className={`${primaryBtn} h-10 w-full text-sm`}
                disabled={pending}
                onClick={() => run(() => setFulfillmentAction('shipped', { tracking_number: trackingNumber, carrier }))}
              >
                <Truck size={14} />{pending ? 'Working…' : 'Confirm shipment'}
              </button>
            </div>
          ) : (
            <>
              <button
                className={`${primaryBtn} h-11 w-full text-sm`}
                disabled={pending}
                onClick={() => (next.ship ? setShipOpen(true) : run(() => setFulfillmentAction(next.to)))}
              >
                <ArrowRight size={15} />{pending ? 'Working…' : next.label}
              </button>
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-3)' }}>{next.hint}</p>
            </>
          )
        ) : (
          /* Never an empty tier: when the nearest move is refused, the guard's
             own sentence says why. */
          <p className="rounded-xl px-3 py-2.5 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
            {allowed.blocked[NEXT_STEP[fulfillmentStatus]?.to ?? 'processing']
              ?? (cancelled ? 'This order is cancelled.' : 'Nothing further to do — this order is complete.')}
          </p>
        )}
      </section>

      {/* ── Tier 2: the payment gate ──────────────────────────────────── */}
      {canMarkPaid && (
        <section className="border-t border-gray-200 pt-4">
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Payment
          </h4>
          <button
            className={`${primaryBtn} h-10 w-full text-sm`}
            disabled={pending}
            onClick={() =>
              setConfirm({
                title: 'Mark this order as paid?',
                body: 'This books the money as received and unlocks fulfillment. It does not charge the customer.',
                confirmLabel: 'Mark as paid',
                run: () => setPaymentAction('paid'),
              })
            }
          >
            <CreditCard size={14} />Mark as paid
          </button>
          <p className="mt-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
            {paymentStatus === 'due_on_delivery'
              ? 'Collected on delivery — mark it paid only if it arrived early.'
              : 'Fulfillment unlocks once payment is marked paid.'}
          </p>
        </section>
      )}

      {/* ── Tier 3: rare, or not to be done by accident ───────────────── */}
      <details className="group border-t border-gray-200 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          More
          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2">
          <button
            className={secondaryBtn}
            disabled={pending || cancelled}
            onClick={() => run(() => holdAction(!onHold))}
          >
            {onHold ? <><PlayCircle size={14} />Release hold</> : <><PauseCircle size={14} />Put on hold</>}
          </button>

          {skips.map((to) => (
            <button key={to} className={secondaryBtn} disabled={pending} onClick={() => confirmMove(to)}>
              Skip to {labelize(to)}
            </button>
          ))}

          <button
            className={secondaryBtn}
            disabled={!allowed.can_refund || pending}
            title={allowed.can_refund ? undefined : allowed.refund_blocked}
            onClick={() =>
              setConfirm({
                title: 'Refund this order?',
                body: 'The money goes back to the customer and the order is marked refunded. This cannot be undone from here.',
                confirmLabel: 'Refund order',
                danger: true,
                restock: { label: 'Put the items back into stock', initial: true },
                run: (restock) => refundAction(restock),
              })
            }
          >
            <RefreshCcw size={14} />
            Refund
            {allowed.can_refund && allowed.refundable && (
              <span className="font-normal" style={{ color: 'var(--text-3)' }}>
                {currency} {allowed.refundable} left
              </span>
            )}
          </button>

          <button
            className={dangerBtn}
            disabled={!allowed.can_cancel || pending}
            title={allowed.can_cancel ? 'Cancel and restock' : allowed.cancel_blocked || 'This order cannot be cancelled'}
            onClick={() =>
              setConfirm({
                title: 'Cancel this order?',
                body: 'The order is closed and its items are credited back to stock. This cannot be undone.',
                confirmLabel: 'Cancel order',
                danger: true,
                run: () => cancelAction(),
              })
            }
          >
            Cancel order
          </button>

          {/* Rewinding a stage is admitting a mistake, not operating the order,
              so it stays the quietest thing on the panel. */}
          {allowed.corrections.length > 0 && (
            <button
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full text-xs transition-colors hover:bg-warning-lighter/40"
              style={{ color: 'var(--text-3)' }}
              disabled={pending}
              onClick={() => setFixOpen(true)}
            >
              <Undo2 size={13} />Correct a mistake
            </button>
          )}
        </div>
      </details>

      {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}

      {confirm && (
        <ConfirmModal
          confirmation={confirm}
          pending={pending}
          onClose={() => setConfirm(null)}
          onConfirm={(restock) => run(() => confirm.run(restock))}
        />
      )}

      {fixOpen && (
        <CorrectionModal
          current={fulfillmentStatus}
          options={allowed.corrections}
          pending={pending}
          onClose={() => setFixOpen(false)}
          onConfirm={(to, reason) => run(() => setFulfillmentAction(to, { correction: true, reason }))}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  confirmation, pending, onClose, onConfirm,
}: {
  confirmation: Confirmation;
  pending: boolean;
  onClose: () => void;
  onConfirm: (restock: boolean) => void;
}) {
  const [restock, setRestock] = useState(confirmation.restock?.initial ?? false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={confirmation.title}
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-light-primary-text font-public-sans">{confirmation.title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer text-light-disabled-text hover:text-light-primary-text">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-light-secondary-text font-public-sans">{confirmation.body}</p>

        {confirmation.restock && (
          <label className="mt-5 flex items-start gap-2.5 text-sm text-light-primary-text font-public-sans">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            {confirmation.restock.label}
          </label>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={`${secondaryBtn} w-auto px-5`} disabled={pending} onClick={onClose}>
            Keep as is
          </button>
          <button
            type="button"
            className={confirmation.danger ? `${dangerBtn} w-auto px-5` : `${primaryBtn} h-10 w-auto px-5 text-sm`}
            disabled={pending}
            onClick={() => onConfirm(restock)}
          >
            {pending ? 'Working…' : confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CorrectionModal({
  current, options, pending, onClose, onConfirm,
}: {
  current: string;
  options: string[];
  pending: boolean;
  onClose: () => void;
  onConfirm: (to: string, reason: string) => void;
}) {
  const [to, setTo] = useState(options[options.length - 1]);
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-light-primary-text font-public-sans">Correct a mistake</h3>
          <button onClick={onClose} className="cursor-pointer text-light-disabled-text hover:text-light-primary-text">
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-xs text-light-secondary-text font-public-sans">
          This order is marked <strong>{labelize(current)}</strong>. Rewinding it clears the stage
          timestamps it never earned and is recorded as a correction. The customer is not emailed.
        </p>

        <div className="space-y-4">
          <FloatingSelect
            label="Move it back to"
            name="to"
            value={to}
            onChange={setTo}
            options={options.map((s) => ({ value: s, label: labelize(s) }))}
          />
          <FloatingTextarea label="What went wrong?" name="reason" rows={3} value={reason} onChange={setReason} />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <PillButton variant="secondary" onClick={onClose}>Cancel</PillButton>
          <PillButton variant="primary" disabled={pending || reason.trim().length === 0} onClick={() => onConfirm(to, reason.trim())}>
            {pending ? 'Working…' : `Revert to ${labelize(to)}`}
          </PillButton>
        </div>
      </div>
    </div>
  );
}
