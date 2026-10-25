'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useAccess } from '@/components/AccessContext';

/* Putting stock back, from the row that already knows which product it is.
 *
 * This replaces a header button that opened a modal with a two-hundred-option
 * product select in it — so adding ten of something already on screen meant
 * finding it again in a list of everything. The row knows the product; the
 * sub-row knows the size. Neither needs to be asked.
 *
 * Deliberately positive-only. Receiving goods is routine and belongs on the
 * row; writing stock off is not, and keeps its reason-and-note dialog in the
 * row menu. A control that does both with a minus sign invites the second by
 * accident.
 */

export type ReceiveResult = { error?: string; movementId?: number };

export default function AddStock({
  productId,
  variantId,
  label,
  unit,
  receiveAction,
  onDone,
}: {
  productId: number;
  variantId?: number;
  /** What the toast should name — the product, or the size within it. */
  label: string;
  unit: string;
  receiveAction: (
    productId: number,
    quantity: number,
    variantId?: number,
  ) => Promise<ReceiveResult>;
  onDone: (outcome: { label: string; quantity: number; movementId?: number; error?: string }) => void;
}) {
  const [custom, setCustom] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { canManageHere } = useAccess();

  if (!canManageHere) return <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>—</span>;

  function receive(quantity: number) {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    startTransition(async () => {
      const result = await receiveAction(productId, quantity, variantId);
      onDone({ label, quantity, movementId: result.movementId, error: result.error });
      if (!result.error) {
        setDone(true);
        clearTimeout(doneTimer.current);
        doneTimer.current = setTimeout(() => setDone(false), 1200);
      }
      setCustom(null);
    });
  }

  if (custom !== null) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={custom}
          inputMode="numeric"
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') receive(Number(custom));
            if (e.key === 'Escape') setCustom(null);
          }}
          onBlur={() => setCustom(null)}
          aria-label={`How many ${unit} of ${label} to add`}
          className="ak-input w-16 text-center font-dm-sans text-[13px] tabular-nums"
          style={{ height: 28, borderRadius: 9999, padding: '0 8px' }}
        />
        <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>↵</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {[10, 50].map((n) => (
        <button
          key={n}
          type="button"
          disabled={pending}
          onClick={() => receive(n)}
          title={`Add ${n} ${unit} of ${label}`}
          className="inline-flex h-7 min-w-[36px] items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors disabled:opacity-50"
          style={{ border: '1px solid var(--border-2)', color: 'var(--text-2)' }}
        >
          +{n}
        </button>
      ))}
      <button
        type="button"
        disabled={pending}
        onClick={() => setCustom('')}
        title={`Add another amount of ${label}`}
        className="inline-flex h-7 items-center justify-center rounded-full px-2.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
        style={{ border: '1px solid var(--border-2)', color: 'var(--text-3)' }}
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : done ? <Check size={12} style={{ color: 'var(--brand)' }} /> : '…'}
      </button>
    </span>
  );
}
