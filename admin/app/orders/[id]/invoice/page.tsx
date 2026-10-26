import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getOrder, getStoreSettings } from '@/lib/admin-api';
import type { StoreSettings } from '@/lib/admin-types';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

function money(v: string | number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function labelize(s: string) {
  return s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  // Lines are stored in the base currency and the totals in the one charged;
  // the invoice is in the latter throughout, so the lines add up to the total.
  const rate = Number(order.fx_rate) || 1;

  let settings: StoreSettings | null = null;
  try {
    settings = await getStoreSettings();
  } catch {
    // Settings API unavailable — fall back to a neutral header.
  }

  const storeName = settings?.business_name || 'Store';
  const issuedAt = order.placed_at || order.created_at;
  const contactName = typeof order.metadata?.contact_name === 'string' ? order.metadata.contact_name : '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2, #F4F4F2)' }}>
      {/* Screen-only toolbar — hidden when printing */}
      <div className="no-print mx-auto flex items-center justify-between gap-3 px-6 py-4" style={{ maxWidth: 760 }}>
        <Link href={`/orders/${order.number}`} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-3, #6B6B66)' }}>
          <ArrowLeft size={11} />Back to order
        </Link>
        <PrintButton />
      </div>

      <div
        className="invoice-sheet mx-auto mb-10 bg-white px-10 py-12"
        style={{ maxWidth: 760, color: '#1A1A17', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 8 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-6 pb-8" style={{ borderBottom: '2px solid #1A1A17' }}>
          <div>
            {settings?.logo_url ? (
              // Plain <img>: merchant-supplied URL from any host, and print
              // stylesheets need the real image element.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt={storeName} style={{ height: 40, width: 'auto', marginBottom: 8 }} />
            ) : (
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>{storeName}</h1>
            )}
            {settings?.tagline && <p style={{ fontSize: 11, color: '#6B6B66', marginTop: 2 }}>{settings.tagline}</p>}
            <div style={{ fontSize: 11, color: '#6B6B66', marginTop: 10, lineHeight: 1.6 }}>
              {settings?.address && <p>{settings.address}</p>}
              {(settings?.city || settings?.country) && <p>{[settings?.city, settings?.country].filter(Boolean).join(', ')}</p>}
              {settings?.support_email && <p>{settings.support_email}</p>}
              {settings?.support_phone && <p>{settings.support_phone}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6B6B66' }}>Invoice</p>
            <p style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, marginTop: 4 }}>{order.number}</p>
            <p style={{ fontSize: 11, color: '#6B6B66', marginTop: 6 }}>
              Issued {new Date(issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p style={{ fontSize: 11, color: '#6B6B66' }}>Status: {labelize(order.status)}</p>
          </div>
        </div>

        {/* Bill to */}
        <div className="py-6">
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B66', marginBottom: 6 }}>
            Billed to
          </p>
          <p style={{ fontSize: 13, fontWeight: 600 }}>{contactName || order.email || 'Guest customer'}</p>
          <div style={{ fontSize: 11, color: '#6B6B66', marginTop: 2, lineHeight: 1.6 }}>
            {order.email && <p>{order.email}</p>}
            {order.phone && <p>{order.phone}</p>}
          </div>
        </div>

        {/* Lines */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1A1A17' }}>
              {['Item', 'SKU', 'Qty', 'Unit price', 'Amount'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i >= 2 ? 'right' : 'left',
                    padding: '8px 4px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#6B6B66',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #E5E5E0' }}>
                <td style={{ padding: '10px 4px', fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '10px 4px', fontFamily: 'monospace', fontSize: 11, color: '#6B6B66' }}>{item.sku || '—'}</td>
                <td style={{ padding: '10px 4px', textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ padding: '10px 4px', textAlign: 'right' }}>{money(Number(item.unit_price) * rate)}</td>
                <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 600 }}>{money(Number(item.line_total) * rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end pt-6">
          <div style={{ width: 260, fontSize: 12 }}>
            {[
              ['Subtotal', money(order.subtotal)],
              ['Shipping', money(order.shipping_total)],
              ...(Number(order.discount_total) > 0 ? [['Discount', `-${money(order.discount_total)}`]] : []),
              ['Tax', money(order.tax_total)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between" style={{ padding: '4px 0', color: '#44443F' }}>
                <span>{label}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
            <div
              className="flex justify-between"
              style={{ padding: '8px 0', marginTop: 6, borderTop: '2px solid #1A1A17', fontSize: 14, fontWeight: 800 }}
            >
              <span>Total ({order.currency})</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(order.grand_total)}</span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 10, color: '#6B6B66', marginTop: 48, textAlign: 'center' }}>
          Thank you for your business. {settings?.support_email ? `Questions? Contact ${settings.support_email}.` : ''}
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .invoice-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
