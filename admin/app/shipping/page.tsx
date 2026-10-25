import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { getShipments, createShipment, updateShipment, getStoreSettings } from '@/lib/admin-api';
import StatCard from '@/components/StatCard';
import Badge, { type BadgeVariant } from '@/components/Badge';
import FilterSelect from '@/components/FilterSelect';
import CreateWaybill from './CreateWaybill';
import EditShipment from './EditShipment';
import { Truck, Package, CheckCircle2, AlertOctagon, Search, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

// The API refuses a second open shipment for one order, and that refusal is
// the useful half of the answer — it names the shipment already carrying the
// parcel. Passing the message through is what tells the merchant to edit it
// rather than leaving them to guess why nothing happened.
function apiMessage(err: unknown, fallback: string) {
  const raw = err instanceof Error ? err.message : '';
  return raw.split(' — ')[1] || fallback;
}

async function createWaybillAction(formData: FormData): Promise<{ error?: string }> {
  'use server';
  const orderNumber = String(formData.get('order_number') || '').trim();
  if (!orderNumber) return { error: 'Enter the order number the parcel belongs to.' };
  try {
    await createShipment({
      order_number: orderNumber,
      provider: String(formData.get('provider') || 'manual'),
      status: 'awaiting_pickup',
      tracking_number: String(formData.get('tracking_number') || '').trim(),
      service_name: String(formData.get('service_name') || '').trim(),
    });
  } catch (err) {
    return { error: apiMessage(err, 'Could not create the waybill. Check the order number and try again.') };
  }
  revalidatePath('/shipping');
  return {};
}

async function updateShipmentAction(id: number, formData: FormData): Promise<{ error?: string }> {
  'use server';
  const eta = String(formData.get('estimated_delivery_at') || '').trim();
  try {
    await updateShipment(id, {
      provider: String(formData.get('provider') || '').trim(),
      status: String(formData.get('status') || '').trim(),
      tracking_number: String(formData.get('tracking_number') || '').trim(),
      tracking_url: String(formData.get('tracking_url') || '').trim(),
      estimated_delivery_at: eta ? new Date(eta).toISOString() : null,
      rider_name: String(formData.get('rider_name') || '').trim(),
      rider_phone: String(formData.get('rider_phone') || '').trim(),
      vehicle: String(formData.get('vehicle') || '').trim(),
      vehicle_plate: String(formData.get('vehicle_plate') || '').trim(),
    });
  } catch (err) {
    return { error: apiMessage(err, 'The shipment could not be saved. Try again.') };
  }
  revalidatePath('/shipping');
  revalidatePath('/orders');
  return {};
}

function shipStatusVariant(s: string): BadgeVariant {
  if (s === 'delivered')        return 'success';
  if (s === 'in_transit')       return 'info';
  if (s === 'awaiting_pickup')  return 'gold';
  if (s === 'failed')           return 'error';
  if (s === 'returned')         return 'error';
  return 'neutral';
}

function labelize(s: string) {
  return s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const carrierStyle: Record<string, React.CSSProperties> = {
  courier: { background: 'var(--green-light)', color: 'var(--badge-success-ink)', border: '1px solid var(--badge-success-line)' },
  dhl:     { background: 'var(--error-light)', color: 'var(--badge-error-ink)',   border: '1px solid var(--badge-error-line)' },
  manual:  { background: 'var(--surface-2)',   color: 'var(--text-2)',            border: '1px solid var(--border-2)' },
};

export default async function ShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; provider?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || '';
  const provider = sp.provider || '';

  const [page, settings] = await Promise.all([
    getShipments({ q, provider, page_size: 100 }),
    getStoreSettings().catch(() => null),
  ]);
  const shipments = page.results;
  const locale = settings?.locale || 'en-US';

  const awaiting  = shipments.filter(s => s.status === 'awaiting_pickup').length;
  const inTransit = shipments.filter(s => s.status === 'in_transit').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const failed    = shipments.filter(s => s.status === 'failed' || s.status === 'returned').length;

  const courierCount = shipments.filter(s => s.provider === 'courier').length;
  const manualCount  = shipments.filter(s => s.provider === 'manual').length;
  const dhlCount     = shipments.filter(s => s.provider === 'dhl').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="dept-code">SHP</span>
            <h2 className="ak-page-title">Shipping & Logistics</h2>
          </div>
          <p className="ak-page-sub">Local courier · Manual dispatch · DHL Express international</p>
        </div>
        <CreateWaybill createAction={createWaybillAction} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Awaiting Pickup"   value={String(awaiting)}  sub="Need action today"     icon={Package}      accent="gold"  />
        <StatCard label="In Transit"        value={String(inTransit)} sub="Out for delivery"       icon={Truck}        accent="blue"  />
        <StatCard label="Delivered"         value={String(delivered)} sub="Completed successfully" icon={CheckCircle2} accent="green" />
        <StatCard label="Failed / Returned" value={String(failed)}    sub="Needs investigation"    icon={AlertOctagon} accent="red"   />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { carrier: 'Local Courier',               count: courierCount, desc: 'Same-day delivery nearby',         color: 'var(--green)' },
          { carrier: 'Manual (Regional)',           count: manualCount,  desc: 'Parcel / courier to other regions', color: 'var(--text-2)' },
          { carrier: 'DHL Express (International)', count: dhlCount,     desc: 'Worldwide + customs + HS codes',    color: 'var(--error)' },
        ].map(c => (
          <div key={c.carrier} className="ak-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{c.carrier}</p>
            </div>
            <p style={{ fontSize: 28, color: 'var(--text-1)', lineHeight: 1 }} className="tabular-nums font-bold">{c.count}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="ak-card">
        <form method="GET" action="/shipping" className="ak-toolbar">
          <div className="ak-input-wrap flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="ak-icon-prefix" />
            <input type="text" name="q" defaultValue={q} placeholder="Search order #, tracking #…" className="ak-input" />
          </div>
          <FilterSelect
            name="provider"
            defaultValue={provider}
            options={[
              { value: '', label: 'All Carriers' },
              { value: 'courier', label: 'Local Courier' },
              { value: 'dhl', label: 'DHL Express' },
              { value: 'manual', label: 'Manual' },
            ]}
          />
          <button type="submit" className="ak-btn-secondary">Search</button>
          {(q || provider) && (
            <Link href="/shipping" className="ak-btn-secondary" style={{ color: 'var(--text-3)' }}>
              Clear
            </Link>
          )}
        </form>

        {shipments.length === 0 ? (
          <div className="ak-empty">
            <div className="icon"><Truck size={20} /></div>
            <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>
              {q || provider ? 'No shipments match this filter' : 'No shipments yet'}
            </p>
            <p>{q || provider ? 'Try a different search or carrier.' : 'Create a waybill to dispatch an order.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ak-table">
              <thead><tr>
                {['Order ID', 'Customer', 'Carrier', 'Tracking', 'Status', 'Cost', 'ETA'].map(h => (
                  <th key={h}>{h}</th>
                ))}
                <th><span className="sr-only">Edit</span></th>
              </tr></thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/orders/${s.order.number}`} className="font-mono text-xs font-semibold" style={{ color: 'var(--green)' }}>
                        {s.order.number}
                      </Link>
                    </td>
                    <td>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-1)' }}>{s.order.email || 'Guest'}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{s.order.phone || '—'}</p>
                    </td>
                    <td>
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold" style={carrierStyle[s.provider] ?? {}}>
                        {labelize(s.provider)}
                      </span>
                    </td>
                    <td>
                      {s.tracking_number ? (
                        s.tracking_url ? (
                          <a
                            href={s.tracking_url}
                            target="_blank"
                            rel="noreferrer"
                            title={`Track ${s.tracking_number} with ${labelize(s.provider)}`}
                            className="inline-flex items-center gap-1 font-mono text-xs"
                            style={{ color: 'var(--green)' }}
                          >
                            {s.tracking_number}<ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="font-mono text-xs" style={{ color: 'var(--text-3)' }}>{s.tracking_number}</span>
                        )
                      ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td><Badge label={labelize(s.status)} variant={shipStatusVariant(s.status)} /></td>
                    <td className="tabular-nums text-xs">{s.currency} {Number(s.cost).toLocaleString(locale, { maximumFractionDigits: 0 })}</td>
                    <td className="tabular-nums text-xs">
                      {s.estimated_delivery_at
                        ? new Date(s.estimated_delivery_at).toLocaleDateString(locale)
                        : '—'}
                    </td>
                    <td><EditShipment shipment={s} updateAction={updateShipmentAction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="ak-footer">
          <span>Showing {shipments.length} of {page.count} shipments</span>
        </div>
      </div>
    </div>
  );
}
