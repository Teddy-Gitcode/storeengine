import { revalidatePath } from 'next/cache';
import RefundsTable from '@/components/RefundsTable';
import OrderStatTile, { type StatAccent } from '@/components/sellzy/order-stat-tile';
import OrderSelect from '@/components/sellzy/order-select';
import OrderPagination from '@/components/sellzy/order-pagination';
import OrderExportButton from '@/components/sellzy/order-export-button';
import { getRefunds, getStoreSettings, approveRefund, rejectRefund } from '@/lib/admin-api';
import type { AdminRefund } from '@/lib/admin-types';
import { RotateCcw, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];
const KIND_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'refund', label: 'Refund' },
  { value: 'return', label: 'Return' },
];

async function approveAction(id: number) {
  'use server';
  await approveRefund(id);
  revalidatePath('/refunds');
}

async function rejectAction(id: number) {
  'use server';
  await rejectRefund(id);
  revalidatePath('/refunds');
}

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; kind?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || '';
  const status = sp.status || '';
  const kind = sp.kind || '';
  const page = Number(sp.page || '1');
  const pageSize = 20;

  const [tablePage, allPage, settings] = await Promise.all([
    getRefunds({ q, status, kind, page: String(page), page_size: pageSize }).catch(() => null),
    getRefunds({ page_size: 500 }).catch(() => null),
    getStoreSettings(),
  ]);
  const unavailable = tablePage === null;
  const refunds = tablePage?.results ?? [];
  const tableCount = tablePage?.count ?? 0;
  const all = allPage?.results ?? [];

  const money = new Intl.NumberFormat(settings?.locale || 'en-US', {
    style: 'currency',
    currency: settings?.currency_code || 'USD',
    maximumFractionDigits: 0,
  });

  const sum = (list: AdminRefund[]) => list.reduce((a, r) => a + Number(r.amount || 0), 0);
  const requested = all.filter((r) => r.status === 'requested');
  const approved = all.filter((r) => r.status === 'approved');
  const rejected = all.filter((r) => r.status === 'rejected');

  const totalPages = Math.max(1, Math.ceil(tableCount / pageSize));
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (kind) params.set('kind', kind);
    if (p > 1) params.set('page', String(p));
    const s = params.toString();
    return s ? `/refunds?${s}` : '/refunds';
  };

  const TILES: { label: string; value: string; icon: typeof Clock; accent: StatAccent }[] = [
    { label: 'Awaiting Review', value: String(requested.length), icon: Clock, accent: '2' },
    { label: 'Approved', value: String(approved.length), icon: CheckCircle2, accent: '1' },
    { label: 'Rejected', value: String(rejected.length), icon: XCircle, accent: 'info' },
    { label: 'Refunded Value', value: money.format(sum(approved)), icon: RotateCcw, accent: '5' },
  ];

  return (
    <div>
      <div className="bg-surface rounded-2xl w-full">
        <div className="sm:p-6 p-4 pb-4">
          <div className="flex justify-between gap-4 mb-6 flex-wrap">
            <h3 className="text-xl font-bold text-light-primary-text leading-7 font-public-sans">Refunds</h3>
            <OrderExportButton
              filename="refunds.csv"
              headers={['ID', 'Order', 'Customer', 'Amount', 'Reason', 'Status', 'Date']}
              rows={refunds.map((r) => [r.id, r.order_number, r.customer, r.amount, r.reason, r.status, r.created_at])}
            />
          </div>

          {unavailable && (
            <div className="mb-4 rounded-xl px-4 py-3 bg-warning-lighter text-warning-dark text-sm font-semibold font-public-sans">
              Refunds aren&apos;t available on the connected backend yet — deploy the latest backend, or point the admin at your local server.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            {TILES.map((t) => (
              <OrderStatTile key={t.label} accent={t.accent} icon={t.icon} label={t.label} value={t.value} />
            ))}
          </div>

          <form method="GET" action="/refunds" className="w-full flex-col sm:flex-row flex justify-between gap-4 items-center">
            <div className="relative sm:w-[300px] w-full">
              <Search size={16} className="absolute text-light-primary-text left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search..."
                className="pl-9 w-full pr-3.5 ring h-9 ring-gray-500/20 py-2 bg-gray-100 border-none rounded-full text-sm focus:outline-none focus:ring-primary transition-all font-normal text-light-primary-text placeholder:text-light-secondary-text font-public-sans"
              />
            </div>
            <div className="flex items-center flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
              <OrderSelect name="kind" defaultValue={kind} options={KIND_OPTIONS} className="min-w-[140px]" />
              <OrderSelect name="status" defaultValue={status} options={STATUS_OPTIONS} className="min-w-[140px]" />
              <button type="submit" className="rounded-full inline-flex items-center justify-center cursor-pointer font-bold transition-colors focus:outline-none border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 h-9 text-sm font-public-sans whitespace-nowrap">
                Search
              </button>
            </div>
          </form>
        </div>

        <RefundsTable
          refunds={refunds}
          money={money}
          locale={settings?.locale || 'en-US'}
          approveAction={approveAction}
          rejectAction={rejectAction}
        />

        <div className="p-4 sm:p-6 border-t border-gray-500/20 flex justify-end">
          <OrderPagination page={page} totalPages={totalPages} makeHref={makeHref} />
        </div>
      </div>
    </div>
  );
}
