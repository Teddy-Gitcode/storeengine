'use client';

import { useState, useTransition } from 'react';
import { UserMinus } from 'lucide-react';
import { useAccess } from '@/components/AccessContext';

/**
 * The backend deletes a customer outright only when they have never ordered —
 * otherwise the account is deactivated, because Order holds the profile with
 * PROTECT. The wording follows whichever will actually happen.
 */
export default function DeactivateCustomer({
  id,
  hasOrders,
  isActive,
  action,
}: {
  id: number;
  hasOrders: boolean;
  isActive: boolean;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { canManageHere } = useAccess();

  if (!canManageHere) return null;

  const verb = hasOrders ? 'Deactivate' : 'Delete';
  const explanation = hasOrders
    ? 'This customer has orders, so the account is deactivated and kept — they can no longer sign in, and the order history stays intact.'
    : 'This customer has never ordered, so the account is deleted for good.';

  function run() {
    setError(null);
    const fd = new FormData();
    fd.set('id', String(id));
    startTransition(async () => {
      const result = await action(fd);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-error/30 bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans">{verb} customer</h2>
          <p className="text-xs text-light-secondary-text font-public-sans">{explanation}</p>
        </div>
        {!isActive && hasOrders ? (
          <span className="text-xs font-semibold text-light-secondary-text font-public-sans">
            Already deactivated
          </span>
        ) : confirming ? (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className="h-7.5 rounded-full bg-error px-4 py-1 text-[13px] font-bold text-white transition-colors hover:bg-error-dark disabled:opacity-50 font-public-sans"
            >
              {pending ? 'Working…' : `Yes, ${verb.toLowerCase()}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-7.5 rounded-full px-4 py-1 text-[13px] font-bold text-light-secondary-text transition-colors hover:bg-gray-100 font-public-sans"
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex h-7.5 items-center gap-1.5 rounded-full border border-error px-4 py-1 text-[13px] font-bold text-error transition-colors hover:bg-error/10 font-public-sans"
          >
            <UserMinus size={13} />{verb} customer
          </button>
        )}
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{error}</p>
      )}
    </div>
  );
}
