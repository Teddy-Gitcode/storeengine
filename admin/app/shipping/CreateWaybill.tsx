'use client';

import { useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';

export default function CreateWaybill({
  createAction,
}: {
  createAction: (formData: FormData) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAction(formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <button data-manage className="ak-btn-primary" onClick={() => setOpen(true)}>
        <Plus size={14} />Create Waybill
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(20, 20, 18, 0.45)' }}
          onClick={() => !pending && setOpen(false)}
        >
          <div className="ak-card w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>Create waybill</p>
              <button className="ak-icon-btn" onClick={() => setOpen(false)} disabled={pending} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <form action={submit} className="space-y-3">
              <div>
                <label className="ak-label" htmlFor="wb-order">Order number</label>
                <input
                  id="wb-order"
                  name="order_number"
                  type="text"
                  className="ak-input w-full font-mono"
                  required
                  placeholder="e.g. SO-260712345"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ak-label" htmlFor="wb-carrier">Carrier</label>
                  <select id="wb-carrier" name="provider" className="ak-select w-full" defaultValue="courier">
                    <option value="courier">Local Courier</option>
                    <option value="dhl">DHL Express</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="ak-label" htmlFor="wb-tracking">Tracking number</label>
                  <input
                    id="wb-tracking"
                    name="tracking_number"
                    type="text"
                    className="ak-input w-full font-mono"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="ak-label" htmlFor="wb-service">Service name</label>
                <input
                  id="wb-service"
                  name="service_name"
                  type="text"
                  className="ak-input w-full"
                  placeholder="e.g. Same-day, Express Worldwide (optional)"
                />
              </div>
              {error && <p style={{ fontSize: 11, color: 'var(--error)' }}>{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="ak-btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </button>
                <button type="submit" className="ak-btn-primary" disabled={pending}>
                  {pending ? 'Creating…' : 'Create waybill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
