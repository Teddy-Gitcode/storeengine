import Link from 'next/link';
import { Pill, labelize, paymentTone } from '@/components/sellzy/order-pill';
import OrderSelect from '@/components/sellzy/order-select';
import OrderPagination from '@/components/sellzy/order-pagination';
import OrderExportButton from '@/components/sellzy/order-export-button';
import { getOrders, getStoreSettings } from '@/lib/admin-api';
import { Search, Eye, CreditCard } from 'lucide-react';
import { paymentLogoFor } from '@/lib/payment-logos';

export const dynamic = 'force-dynamic';

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All payment states' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'due_on_delivery', label: 'Due on delivery' },
  { value: 'partially_refunded', label: 'Partially refunded' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' },
];

const METHOD_LABELS: Record<string, string> = { prepaid: 'Prepaid', cod: 'Cash on delivery' };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; payment_status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || '';
  const paymentStatus = sp.payment_status || '';
  const page = Number(sp.page || '1');
  const pageSize = 20;

  const [tablePage, settings] = await Promise.all([
    // `payment_status` is a filterset field on the admin orders endpoint, so the
    // filter has to be applied there — filtering the fetched page instead left
    // the pager counting rows the filter had already thrown away.
    getOrders({ q, payment_status: paymentStatus, page: String(page), page_size: pageSize } as never),
    getStoreSettings(),
  ]);
  const orders = tablePage.results;

  const money = new Intl.NumberFormat(settings?.locale || 'en-US', {
    style: 'currency',
    currency: settings?.currency_code || 'USD',
    maximumFractionDigits: 0,
  });
  const date = (v: string | null) =>
    v ? new Date(v).toLocaleDateString(settings?.locale || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const totalPages = Math.max(1, Math.ceil(tablePage.count / pageSize));
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (paymentStatus) params.set('payment_status', paymentStatus);
    if (p > 1) params.set('page', String(p));
    const s = params.toString();
    return s ? `/orders/transactions?${s}` : '/orders/transactions';
  };

  return (
    <div className="bg-surface rounded-2xl w-full">
      <div className="p-4 sm:p-6 pb-4">
        <div className="flex items-center gap-4 mb-4 sm:mb-6 justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-light-primary-text font-public-sans">Transactions</h2>
          <OrderExportButton
            filename="orders-transactions.csv"
            headers={['Order', 'Amount', 'Method', 'Email', 'Payment status', 'Date']}
            rows={orders.map((o) => [o.number, o.grand_total, o.payment_method, o.email, o.payment_status, o.placed_at || o.created_at])}
          />
        </div>
        <form method="GET" action="/orders/transactions" className="w-full flex flex-col sm:flex-row justify-between gap-4">
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
          <div className="flex items-center flex-wrap gap-3">
            <OrderSelect name="payment_status" defaultValue={paymentStatus} options={PAYMENT_STATUS_OPTIONS} className="min-w-[140px]" />
            <button type="submit" className="rounded-full inline-flex items-center justify-center cursor-pointer font-bold transition-colors focus:outline-none border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 h-9 text-sm font-public-sans">
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="transition-colors bg-gray-100 hover:bg-gray-100 border-y border-gray-500/20">
              {['ID', 'Amount', 'Method', 'Mail', 'Status', 'Date'].map((h) => (
                <th key={h} className="h-12 p-3 first:pl-6 whitespace-nowrap text-left align-middle text-light-primary-text text-sm font-semibold font-public-sans">{h}</th>
              ))}
              <th className="h-12 p-3 whitespace-nowrap text-left align-middle text-light-primary-text text-sm font-semibold pr-6 font-public-sans">Action</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {orders.map((o) => (
              <tr key={o.id} className="transition-colors border-b last:border-0 border-gray-500/20 hover:bg-gray-50/50">
                <td className="px-3 py-3.5 pl-6 align-middle font-normal text-sm text-light-secondary-text whitespace-nowrap font-public-sans">{o.number}</td>
                <td className="px-3 py-3.5 align-middle text-sm font-medium text-light-primary-text whitespace-nowrap font-dm-sans">{money.format(Number(o.grand_total))}</td>
                <td className="px-3 py-3.5 align-middle whitespace-nowrap min-w-40">
                  <div className="flex items-center gap-2">
                    {/* Brand logo where we recognise the method, icon otherwise. */}
                    <div className="shrink-0 size-8 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center text-light-primary-text">
                      {paymentLogoFor(o.payment_method) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={paymentLogoFor(o.payment_method)!} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <CreditCard size={15} />
                      )}
                    </div>
                    <span className="text-sm text-light-secondary-text font-public-sans">{METHOD_LABELS[o.payment_method] ?? labelize(o.payment_method)}</span>
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle text-sm min-w-60 whitespace-nowrap text-light-secondary-text font-public-sans">{o.email || '—'}</td>
                <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                  <Pill label={labelize(o.payment_status)} tone={paymentTone(o.payment_status)} solid />
                </td>
                <td className="px-3 py-3.5 align-middle text-sm text-light-secondary-text whitespace-nowrap font-public-sans">{date(o.placed_at || o.created_at)}</td>
                <td className="px-3 py-3.5 align-middle pr-6 whitespace-nowrap">
                  <Link
                    href={`/orders/${o.number}`}
                    aria-label={`Open order ${o.number}`}
                    title="Open order"
                    className="inline-flex items-center justify-center cursor-pointer font-bold transition-colors focus:outline-none rounded-lg hover:bg-gray-100 h-8 w-8 p-0 text-light-primary-text hover:text-primary"
                  >
                    <Eye size={15} />
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-sm text-light-secondary-text font-public-sans">No transactions match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 sm:p-6 border-t border-gray-500/20 flex justify-end">
        <OrderPagination page={page} totalPages={totalPages} makeHref={makeHref} />
      </div>
    </div>
  );
}
