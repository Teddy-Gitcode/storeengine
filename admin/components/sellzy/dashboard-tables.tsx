'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActionResult } from '@/app/dashboard-actions';

// ── Shared pager — the template's `‹ 1 2 3 ›` bar (rounded pills, active page
// bg-primary-lighter). Client-side: paginates the rows already on the page.
function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const arrow = 'w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 transition-colors';
  return (
    <div className="flex items-center justify-center gap-1 px-6 py-4 border-t border-[rgba(145,158,171,0.20)]">
      <button className={arrow} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="size-5" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-public-sans transition-colors ${
            p === page ? 'bg-primary-lighter text-primary-dark font-semibold' : 'text-gray-600 hover:bg-gray-50 font-medium'
          }`}
        >
          {p}
        </button>
      ))}
      <button className={arrow} onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

const PER_PAGE = 5;
const th = 'p-3 first:pl-5 last:pr-5 text-left align-middle py-3 whitespace-nowrap font-semibold font-public-sans text-sm text-light-primary-text h-auto';
const td = 'px-3 first:pl-5 last:pr-5 align-middle py-4';

function pretty(s: string) {
  return s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

// ── Recent Orders ────────────────────────────────────────────────────────────
export type RecentOrder = {
  number: string;
  email: string;
  placed_at: string;
  items: number;
  grand_total: number | string;
  status: string;
};

const ORDER_STATUS_BADGE: Record<string, string> = {
  delivered: 'bg-success/16 text-success-dark',
  paid: 'bg-info/16 text-info-dark',
  processing: 'bg-warning/16 text-warning-dark',
  packed: 'bg-info/16 text-info-dark',
  shipped: 'bg-info/16 text-info-dark',
  pending_payment: 'bg-warning/16 text-warning-dark',
  draft: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-error/16 text-error-dark',
  refunded: 'bg-error/16 text-error-dark',
};

const CANCELLABLE = new Set(['pending_payment', 'paid', 'processing', 'packed', 'draft']);

export function RecentOrdersTable({
  orders,
  currencyCode = 'USD',
  locale = 'en-US',
  onCancel,
}: {
  orders: RecentOrder[];
  currencyCode?: string;
  locale?: string;
  onCancel?: (number: string) => Promise<ActionResult>;
}) {
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 });
  const dateFmt = (v: string) => new Date(v).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const totalPages = Math.max(1, Math.ceil(orders.length / PER_PAGE));
  const cur = Math.min(page, totalPages);
  const rows = orders.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  function cancel(number: string) {
    if (!onCancel) return;
    setError(null);
    startTransition(async () => {
      const res = await onCancel(number);
      setConfirming(null);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="border border-gray-500/20 rounded-2xl w-full">
      <div className="px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg text-light-primary-text font-public-sans font-bold">Recent Orders</h3>
        <Link href="/orders" className="text-xs font-public-sans font-semibold inline-flex items-center gap-1 text-primary hover:text-primary-dark">
          View all <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {error && (
        <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-error/10 text-error-dark text-xs font-public-sans">{error}</div>
      )}
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b border-[rgba(145,158,171,0.20)]">
              {['Order ID', 'Customer', 'Order Date', 'Items', 'Price', 'Status', 'Action'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {rows.map((o) => (
              <tr key={o.number} className="border-b border-[rgba(145,158,171,0.20)] last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className={td}>
                  <Link href={`/orders/${o.number}`} className="font-dm-sans text-xs font-semibold text-primary hover:text-primary-dark">{o.number}</Link>
                </td>
                <td className={`${td} text-sm font-public-sans text-light-secondary-text`}>{o.email}</td>
                <td className={`${td} text-sm font-dm-sans text-light-secondary-text`}>{dateFmt(o.placed_at)}</td>
                <td className={`${td} text-sm font-dm-sans text-light-primary-text`}>{o.items}</td>
                <td className={`${td} text-sm font-dm-sans font-semibold text-light-primary-text`}>{money.format(Number(o.grand_total))}</td>
                <td className={td}>
                  <span className={`px-2 py-1 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium ${ORDER_STATUS_BADGE[o.status] ?? 'bg-gray-200 text-gray-700'}`}>
                    {pretty(o.status)}
                  </span>
                </td>
                <td className={td}>
                  {CANCELLABLE.has(o.status) && onCancel ? (
                    confirming === o.number ? (
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => cancel(o.number)}
                          disabled={pending}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold font-public-sans bg-error text-white hover:bg-error-dark disabled:opacity-50 transition-colors"
                        >
                          {pending ? 'Cancelling…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          disabled={pending}
                          className="px-2.5 py-1 rounded-full text-xs font-medium font-public-sans text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => { setConfirming(o.number); setError(null); }}
                        className="px-3 py-1 rounded-full text-xs font-semibold font-public-sans text-error hover:bg-error/10 transition-colors"
                      >
                        Cancel
                      </button>
                    )
                  ) : (
                    <Link
                      href={`/orders/${o.number}`}
                      className="px-3 py-1 rounded-full text-xs font-semibold font-public-sans text-primary hover:bg-primary/10 transition-colors"
                    >
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-sm font-public-sans text-light-secondary-text">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={cur} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

// ── Stock Update ─────────────────────────────────────────────────────────────
export type StockRow = {
  id: number;
  productId: number;
  name: string;
  slug: string;
  category: string;
  quantity: number;
  reorder: number;
};

function stockStatus(q: number, reorder: number) {
  if (q === 0) return { label: 'Out of Stock', cls: 'bg-error/16 text-error-dark' };
  if (q <= reorder) return { label: 'Low Stock', cls: 'bg-warning/16 text-warning-dark' };
  return { label: 'In Stock', cls: 'bg-success/16 text-success-dark' };
}

export function StockUpdateTable({ items, vendorName }: { items: StockRow[]; vendorName: string }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const cur = Math.min(page, totalPages);
  const rows = items.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  return (
    <div className="border border-gray-500/20 rounded-2xl w-full">
      <div className="px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg text-light-primary-text font-public-sans font-bold">Stock Update</h3>
        <Link href="/products/stocks" className="text-xs font-public-sans font-semibold inline-flex items-center gap-1 text-primary hover:text-primary-dark">
          View all <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b border-[rgba(145,158,171,0.20)]">
              {['Product Name', 'Category', 'Current Stock', 'Status', 'Vendor', 'Action'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {rows.map((item) => {
              const st = stockStatus(item.quantity, item.reorder);
              return (
                <tr key={item.id} className="border-b border-[rgba(145,158,171,0.20)] last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className={`${td} py-2.5 whitespace-nowrap`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg shrink-0 bg-gray-100 flex items-center justify-center text-xs font-bold font-dm-sans text-light-secondary-text">
                        {initials(item.name)}
                      </div>
                      <div>
                        <div className="font-semibold font-public-sans text-light-primary-text text-sm">{item.name}</div>
                        <div className="text-sm font-dm-sans text-light-secondary-text">ID: #{item.productId}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`${td} py-2.5 whitespace-nowrap text-sm font-public-sans text-light-secondary-text`}>{pretty(item.category || '—')}</td>
                  <td className={`${td} py-2.5 whitespace-nowrap text-sm font-dm-sans text-light-primary-text`}>{item.quantity}</td>
                  <td className={`${td} py-2.5 whitespace-nowrap`}>
                    <span className={`px-2 py-1 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className={`${td} py-2.5 whitespace-nowrap text-sm font-public-sans text-light-secondary-text`}>{vendorName}</td>
                  <td className={`${td} py-2.5 whitespace-nowrap`}>
                    {/* `?product=` was never read by /products/stocks, so this
                        landed on the unfiltered list. The order-request form is
                        what "Order Now" actually promises. */}
                    <Link
                      href="/products/stocks/order-request"
                      title={`Raise a stock order for ${item.name}`}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold font-public-sans bg-primary-lighter text-primary-dark hover:bg-primary hover:text-white transition-colors"
                    >
                      Order Now
                    </Link>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-sm font-public-sans text-light-secondary-text">No stock data available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={cur} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}


