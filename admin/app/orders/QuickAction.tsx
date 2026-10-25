'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Truck } from 'lucide-react';
import { useAccess } from '@/components/AccessContext';

/* The next step, offered from the row.
 *
 * Processing an order used to mean opening it, scrolling past two tables and a
 * customer card, and finding the action panel at the bottom. Most orders only
 * ever need the obvious next move, and this is that move — but only when the
 * backend's own guard has already said it is legal (the row passes what
 * `allowed_transitions` returned, so this button can never be the one that
 * fails).
 *
 * A step that needs typing — a tracking number — is not done here. It links to
 * the order instead, because a 90px table cell is the wrong place to fill in a
 * waybill.
 */

export type Step = {
  to: string;
  label: string;
  kind: 'fulfillment' | 'payment';
  /** Needs input, so it belongs on the order's own page. */
  needsInput?: boolean;
};

export default function QuickAction({
  number,
  step,
  action,
}: {
  number: string;
  step: Step | null;
  action: (number: string, to: string, kind: 'fulfillment' | 'payment') => Promise<{ error?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Moving an order on is orders: manage, the same rule the order screen's own
  // buttons follow.
  const { canManageHere } = useAccess();

  if (!step || !canManageHere) return <span style={{ color: 'var(--text-3)' }}>—</span>;

  if (step.needsInput) {
    return (
      <Link
        href={`/orders/${number}#act`}
        className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors"
        style={{ border: '1px solid var(--border-2)', color: 'var(--text-2)' }}
        title="Needs a tracking number — opens the order"
      >
        <Truck size={12} />{step.label}
      </Link>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await action(number, step.to, step.kind);
            if (result && 'error' in result && result.error) setError(result.error);
          });
        }}
        className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{ border: '1px solid var(--brand-border)', color: 'var(--brand-ink)' }}
      >
        <ArrowRight size={12} />{pending ? 'Working…' : step.label}
      </button>
      {error && <span className="text-[10px]" style={{ color: 'var(--error)' }}>{error}</span>}
    </span>
  );
}
