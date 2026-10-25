'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';

/**
 * Approve / Reject for this one request. Both take an optional note, revealed
 * once a decision is picked so the staff member can say why. The template
 * labelled these "Approve All" / "Reject All"; there is only ever one request
 * on this page, and the same pair on the list rows says plain Approve/Reject.
 */
export default function RefundDecision({
  id,
  status,
  approveAction,
  rejectAction,
}: {
  id: number;
  status: string;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
}) {
  const [choice, setChoice] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  if (status !== 'requested') {
    return (
      <span className="text-xs font-semibold text-light-secondary-text font-public-sans">
        Already {status === 'approved' ? 'approved' : 'rejected'}
      </span>
    );
  }

  function run(kind: 'approve' | 'reject') {
    const fd = new FormData();
    fd.set('id', String(id));
    fd.set('note', note);
    startTransition(async () => {
      await (kind === 'approve' ? approveAction(fd) : rejectAction(fd));
      setChoice(null);
      setNote('');
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {choice && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="h-7.5 w-56 rounded-full border border-gray-300 px-3.5 text-[13px] text-light-primary-text focus:border-primary focus:outline-none font-public-sans"
        />
      )}
      <button
        type="button"
        onClick={() => (choice === 'approve' ? run('approve') : setChoice('approve'))}
        disabled={pending}
        className="inline-flex h-7.5 items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-[13px] font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-50 font-public-sans"
      >
        <Check size={13} />
        {choice === 'approve' ? (pending ? 'Approving…' : 'Confirm approve') : 'Approve'}
      </button>
      <button
        type="button"
        onClick={() => (choice === 'reject' ? run('reject') : setChoice('reject'))}
        disabled={pending}
        className="inline-flex h-7.5 items-center gap-1.5 rounded-full border border-error px-4 py-1 text-[13px] font-bold text-error transition-colors hover:bg-error/10 disabled:opacity-50 font-public-sans"
      >
        <X size={13} />
        {choice === 'reject' ? (pending ? 'Rejecting…' : 'Confirm reject') : 'Reject'}
      </button>
    </div>
  );
}
