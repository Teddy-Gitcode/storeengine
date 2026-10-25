'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAccess } from '@/components/AccessContext';

/**
 * Two-step delete for a hero slide. The same in-place confirm the product
 * editor and the resource lists use — deleting a live slide with one stray
 * click has no undo.
 */
export default function DeleteSlideButton({
  id,
  action,
}: {
  id: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const { canManageHere } = useAccess();

  if (!canManageHere) return null;

  if (!confirming) {
    return (
      <button
        type="button"
        className="ak-btn-secondary w-full justify-center text-red-700"
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={13} />
        Delete
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <form action={action} className="flex-1" onSubmit={() => setConfirming(false)}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="ak-btn-secondary w-full justify-center text-red-700"
          style={{ borderColor: 'var(--error)' }}
        >
          Yes, delete
        </button>
      </form>
      <button type="button" className="ak-btn-secondary justify-center" onClick={() => setConfirming(false)}>
        Keep
      </button>
    </div>
  );
}
