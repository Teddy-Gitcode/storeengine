'use client';

import { useState } from 'react';
import { Copy, Send, Trash2 } from 'lucide-react';

/**
 * Send and Delete both confirm in place. Send is the one that matters: it
 * pushes a notification to every device in the audience the instant it is
 * clicked, and there is no recalling it.
 */
export default function CampaignActions({
  id,
  name,
  reach,
  configured,
  sendAction,
  duplicateAction,
  deleteAction,
}: {
  id: number;
  name: string;
  reach: number;
  configured: boolean;
  sendAction: (formData: FormData) => Promise<void>;
  duplicateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState<'send' | 'delete' | null>(null);

  if (confirm === 'send') {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>
          Send “{name}” to {reach} device{reach === 1 ? '' : 's'} now?
        </span>
        <div className="flex justify-end gap-1.5">
          <form action={sendAction} onSubmit={() => setConfirm(null)}>
            <input type="hidden" name="id" value={id} />
            <button className="ak-btn-primary" type="submit">
              <Send size={13} /> Yes, send
            </button>
          </form>
          <button className="ak-btn-secondary" type="button" onClick={() => setConfirm(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (confirm === 'delete') {
    return (
      <div className="flex justify-end gap-1.5">
        <form action={deleteAction} onSubmit={() => setConfirm(null)}>
          <input type="hidden" name="id" value={id} />
          <button className="ak-btn-secondary" type="submit" style={{ color: 'var(--error)' }}>
            Yes, delete
          </button>
        </form>
        <button className="ak-btn-secondary" type="button" onClick={() => setConfirm(null)}>
          Keep
        </button>
      </div>
    );
  }

  return (
    <div data-manage className="flex justify-end gap-1.5">
      <button
        className="ak-btn-primary"
        type="button"
        disabled={!configured}
        onClick={() => setConfirm('send')}
        title={configured ? 'Send now' : 'Add Firebase credentials first'}
      >
        <Send size={13} /> Send
      </button>
      <form action={duplicateAction}>
        <input type="hidden" name="id" value={id} />
        <button className="ak-btn-secondary" type="submit" title="Duplicate">
          <Copy size={13} />
        </button>
      </form>
      <button
        className="ak-btn-secondary"
        type="button"
        onClick={() => setConfirm('delete')}
        title="Delete"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
