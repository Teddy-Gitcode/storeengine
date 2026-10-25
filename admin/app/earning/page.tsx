import StatCard from '@/components/StatCard';
import Badge, { type BadgeVariant } from '@/components/Badge';
import FilterSelect from '@/components/FilterSelect';
import { getPayments, getStoreSettings } from '@/lib/admin-api';
import type { AdminPayment } from '@/lib/admin-types';
import { DollarSign, Clock, RotateCcw, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

function paymentStatusVariant(s: string): BadgeVariant {
  if (s === 'confirmed') return 'success';
  if (s === 'initiated' || s === 'pending') return 'warning';
  if (s === 'failed') return 'error';
  if (s === 'refunded') return 'purple';
  if (s === 'cancelled') return 'error';
  return 'neutral';
}

function orderStatusVariant(s: string): BadgeVariant {
  if (s === 'delivered') return 'success';
  if (s === 'paid' || s === 'processing' || s === 'packed' || s === 'shipped') return 'info';
  if (s === 'pending_payment' || s === 'draft') return 'warning';
  if (s === 'refunded') return 'purple';
  if (s === 'cancelled') return 'error';
  return 'neutral';
}

function labelize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PROVIDER_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money',
  stripe: 'Stripe',
  paypal: 'PayPal',
  manual: 'Manual',
};

const providerStyle: Record<string, React.CSSProperties> = {
  mobile_money: { background: 'var(--green-light)', color: 'var(--badge-success-ink)', border: '1px solid var(--badge-success-line)' },
  stripe: { background: 'var(--info-light)', color: 'var(--badge-info-ink)', border: '1px solid var(--badge-info-line)' },
  paypal: { background: 'var(--gold-light)', color: 'var(--badge-warning-ink)', border: '1px solid var(--badge-warning-line)' },
  manual: { background: 'var(--surface-2, #F4F4F5)', color: 'var(--text-2)', border: '1px solid var(--border)' },
};

const PROVIDER_COLORS: Record<string, string> = {
  mobile_money: 'var(--green)',
  stripe: 'var(--info)',
  paypal: 'var(--gold)',
  manual: 'var(--text-3)',
};

const STATUS_OPTIONS = ['', 'initiated', 'pending', 'confirmed', 'failed', 'cancelled', 'refunded'];

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; provider?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || '';
  const provider = sp.provider || '';
  const status = sp.status || '';
  const page = Number(sp.page || '1');

  const pageSize = 20;
  const [tablePage, allPage, settings] = await Promise.all([
    getPayments({ q, provider, status, page: String(page), page_size: pageSize }),
    getPayments({ page_size: 200 }),
    getStoreSettings(),
  ]);
  const payments = tablePage.results;
  const all = allPage.results;

  const money = new Intl.NumberFormat(settings?.locale || 'en-US', {
    style: 'currency',
    currency: settings?.currency_code || 'USD',
    maximumFractionDigits: 0,
  });

  const now = new Date();
  const isMtd = (p: AdminPayment) => {
    const d = new Date(p.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const sum = (list: AdminPayment[]) => list.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const confirmedMtd = all.filter((p) => p.status === 'confirmed' && isMtd(p));
  const pendingList = all.filter((p) => p.status === 'initiated' || p.status === 'pending');
  const failedMtd = all.filter((p) => p.status === 'failed' && isMtd(p));
  const refunded = all.filter((p) => p.status === 'refunded');

  const revenueMtd = sum(confirmedMtd);
  const byProvider = Object.keys(PROVIDER_LABELS)
    .map((key) => ({ key, total: sum(confirmedMtd.filter((p) => p.provider === key)) }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalPages = Math.max(1, Math.ceil(tablePage.count / pageSize));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (provider) params.set('provider', provider);
    if (status) params.set('status', status);
    if (p > 1) params.set('page', String(p));
    const s = params.toString();
    return s ? `?${s}` : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="dept-code">FIN</span>
            <h2 className="ak-page-title">Finance & Accounting</h2>
          </div>
          <p className="ak-page-sub">Payments and reconciliation · {allPage.count} payments on record</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Revenue MTD" value={money.format(revenueMtd)} sub={`${confirmedMtd.length} confirmed payments`} icon={DollarSign} accent="green" />
        <StatCard label="Pending" value={money.format(sum(pendingList))} sub={`${pendingList.length} awaiting confirmation`} icon={Clock} accent="gold" />
        <StatCard label="Refunded" value={money.format(sum(refunded))} sub={`${refunded.length} refunds all-time`} icon={RotateCcw} accent="blue" />
        <StatCard label="Failed MTD" value={String(failedMtd.length)} sub={failedMtd.length ? 'Requires follow-up' : 'Nothing to chase'} trend={failedMtd.length ? 'down' : 'neutral'} icon={AlertCircle} accent="red" />
      </div>

      {/* Channel summary (confirmed revenue this month) */}
      {byProvider.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {byProvider.map((item) => (
            <div key={item.key} className="ak-card flex items-center gap-4 p-5">
              <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: PROVIDER_COLORS[item.key] }} />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
                  {PROVIDER_LABELS[item.key]} Revenue MTD
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-dm-serif)' }} className="tabular-nums mt-0.5">
                  {money.format(item.total)}
                </p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: PROVIDER_COLORS[item.key] }}>
                {revenueMtd ? Math.round((item.total / revenueMtd) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="ak-card">
        <form method="GET" action="/earning" className="ak-toolbar">
          <div className="ak-input-wrap flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="ak-icon-prefix" />
            <input type="text" name="q" defaultValue={q} placeholder="Search order #, reference…" className="ak-input" />
          </div>
          <FilterSelect
            name="provider"
            defaultValue={provider}
            options={[
              { value: '', label: 'All methods' },
              ...Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            name="status"
            defaultValue={status}
            options={STATUS_OPTIONS.map((value) => ({ value, label: value ? labelize(value) : 'All statuses' }))}
          />
          <button type="submit" className="ak-btn-secondary">Search</button>
        </form>

        <div className="overflow-x-auto">
          <table className="ak-table">
            <thead><tr>
              {['Order', 'Order Status', 'Amount', 'Method', 'Provider Reference', 'Status', 'Date'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td><span className="font-mono text-xs font-semibold" style={{ color: 'var(--green)' }}>{p.order?.number || '—'}</span></td>
                  <td><Badge label={labelize(p.order?.status || 'unknown')} variant={orderStatusVariant(p.order?.status || '')} /></td>
                  <td><span className="font-bold tabular-nums text-sm" style={{ color: 'var(--text-1)' }}>{money.format(Number(p.amount))}</span></td>
                  <td>
                    <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold" style={providerStyle[p.provider] ?? {}}>
                      {PROVIDER_LABELS[p.provider] ?? labelize(p.provider)}
                    </span>
                  </td>
                  <td><span className="font-mono text-xs" style={{ color: 'var(--text-3)' }}>{p.provider_reference || '—'}</span></td>
                  <td><Badge label={labelize(p.status)} variant={paymentStatusVariant(p.status)} /></td>
                  <td className="tabular-nums text-xs">{new Date(p.created_at).toLocaleDateString(settings?.locale || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: 'var(--text-3)' }}>No payments match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ak-footer">
          <span>Showing {payments.length} of {tablePage.count} payments</span>
          <div className="ak-pager">
            {page > 1 && <a className="ak-btn-secondary" href={`/earning${qs(page - 1)}`}><ChevronLeft size={12} />Prev</a>}
            <span className="px-2 text-xs" style={{ color: 'var(--text-3)' }}>Page {page} of {totalPages}</span>
            {page < totalPages && <a className="ak-btn-secondary" href={`/earning${qs(page + 1)}`}>Next<ChevronRight size={12} /></a>}
          </div>
        </div>
      </div>
    </div>
  );
}
