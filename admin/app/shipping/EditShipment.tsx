'use client';

import { useState, useTransition } from 'react';
import { Pencil, X } from 'lucide-react';
import type { AdminShipment } from '@/lib/admin-types';

export default function EditShipment({
  shipment,
  updateAction,
}: {
  shipment: AdminShipment;
  updateAction: (id: number, formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateAction(shipment.id, formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  // The API stores an ISO timestamp; datetime-local wants it without the zone.
  const eta = shipment.estimated_delivery_at
    ? new Date(shipment.estimated_delivery_at).toISOString().slice(0, 16)
    : '';

  return (
    <>
      <button
        data-manage
        className="ak-icon-btn"
        onClick={() => setOpen(true)}
        aria-label={`Edit shipment for order ${shipment.order.number}`}
        title="Edit shipment"
      >
        <Pencil size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(20, 20, 18, 0.45)' }}
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="ak-card w-full max-w-md p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-ship-${shipment.id}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p id={`edit-ship-${shipment.id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>
                Shipment · {shipment.order.number}
              </p>
              <button className="ak-icon-btn" onClick={() => setOpen(false)} disabled={pending} aria-label="Close">
                <X size={14} />
              </button>
            </div>

            <form action={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ak-label" htmlFor={`ship-carrier-${shipment.id}`}>Carrier</label>
                  <select
                    id={`ship-carrier-${shipment.id}`}
                    name="provider"
                    className="ak-input w-full"
                    defaultValue={shipment.provider}
                  >
                    <option value="courier">Local Courier</option>
                    <option value="dhl">DHL Express</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="ak-label" htmlFor={`ship-status-${shipment.id}`}>Status</label>
                  <select
                    id={`ship-status-${shipment.id}`}
                    name="status"
                    className="ak-input w-full"
                    defaultValue={shipment.status}
                  >
                    <option value="draft">Draft</option>
                    <option value="awaiting_pickup">Awaiting pickup</option>
                    <option value="in_transit">In transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed">Failed</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="ak-label" htmlFor={`ship-track-${shipment.id}`}>Tracking number</label>
                <input
                  id={`ship-track-${shipment.id}`}
                  name="tracking_number"
                  className="ak-input w-full font-mono"
                  defaultValue={shipment.tracking_number}
                />
              </div>

              <div>
                <label className="ak-label" htmlFor={`ship-url-${shipment.id}`}>Tracking link</label>
                <input
                  id={`ship-url-${shipment.id}`}
                  name="tracking_url"
                  type="url"
                  inputMode="url"
                  className="ak-input w-full"
                  defaultValue={shipment.tracking_url}
                  placeholder="https://"
                />
              </div>

              <div>
                <label className="ak-label" htmlFor={`ship-eta-${shipment.id}`}>Estimated delivery</label>
                <input
                  id={`ship-eta-${shipment.id}`}
                  name="estimated_delivery_at"
                  type="datetime-local"
                  className="ak-input w-full"
                  defaultValue={eta}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                  Shown to the customer on their tracking page.
                </p>
              </div>

              {/* The rider card on the app's live-tracking map. Leave empty for
                  a courier parcel. */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['rider_name', 'Rider name', shipment.rider_name, 'text'],
                  ['rider_phone', 'Rider phone', shipment.rider_phone, 'tel'],
                  ['vehicle', 'Vehicle', shipment.vehicle, 'text'],
                  ['vehicle_plate', 'Plate', shipment.vehicle_plate, 'text'],
                ] as const).map(([name, label, value, type]) => (
                  <div key={name}>
                    <label className="ak-label" htmlFor={`ship-${name}-${shipment.id}`}>{label}</label>
                    <input
                      id={`ship-${name}-${shipment.id}`}
                      name={name}
                      type={type}
                      className={`ak-input w-full ${name === 'vehicle_plate' ? 'font-mono uppercase' : ''}`}
                      defaultValue={value ?? ''}
                      placeholder={name === 'vehicle' ? 'Honda Wave · Black' : undefined}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] -mt-1" style={{ color: 'var(--text-3)' }}>
                Rider details show on the customer&rsquo;s live-tracking map in the app, with a call button.
              </p>

              {error && <p className="text-[12px]" style={{ color: 'var(--error)' }} role="alert">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="ak-btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </button>
                <button type="submit" className="ak-btn-primary" disabled={pending}>
                  {pending ? 'Saving…' : 'Save shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
