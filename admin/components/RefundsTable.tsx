import Link from 'next/link';
import { Pill, labelize, refundTone } from './sellzy/order-pill';
import type { AdminRefund } from '@/lib/admin-types';

const outlineBtn = 'rounded-full inline-flex items-center justify-center cursor-pointer font-bold transition-colors focus:outline-none border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1 h-[30px] text-[13px] leading-[22px] whitespace-nowrap font-public-sans';
const primaryBtn = 'rounded-full inline-flex items-center justify-center cursor-pointer font-bold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 bg-primary text-white hover:bg-primary-dark px-4 py-1 h-[30px] text-[13px] leading-[22px] font-public-sans';
const dangerBtn = 'rounded-full inline-flex items-center justify-center cursor-pointer font-bold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ring ring-[rgba(255,72,66,0.48)] text-error hover:bg-error-lighter/40 px-4 py-1 h-[30px] text-[13px] leading-[22px] font-public-sans';

/**
 * Refund / return request table shared by the finance Refunds view and the
 * Order Management "Return & Refund" view. Approve/reject are wired through
 * server-action props so each page can revalidate its own path.
 * Pixel match for the template's `refunds.html` table.
 */
export default function RefundsTable({
  refunds,
  money,
  locale = 'en-US',
  approveAction,
  rejectAction,
  emptyLabel = 'No refund requests match these filters.',
}: {
  refunds: AdminRefund[];
  money: Intl.NumberFormat;
  locale?: string;
  approveAction: (id: number) => Promise<void>;
  rejectAction: (id: number) => Promise<void>;
  emptyLabel?: string;
}) {
  const date = (v: string | null) =>
    v ? new Date(v).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="transition-colors bg-gray-100 hover:bg-gray-100 border-y border-gray-500/20">
            {['ID', 'Order ID', 'Customer', 'Type', 'Amount', 'Reason', 'Status', 'Date'].map((h) => (
              <th key={h} className="h-12 p-3 first:pl-6 whitespace-nowrap text-left align-middle text-light-primary-text text-sm font-semibold font-public-sans">{h}</th>
            ))}
            <th className="h-12 p-3 whitespace-nowrap text-left align-middle text-light-primary-text text-sm font-semibold pr-6 font-public-sans">Action</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {refunds.map((r) => (
            <tr key={r.id} className="transition-colors border-b last:border-0 border-gray-500/20 hover:bg-gray-50/50">
              <td className="px-3 py-3.5 pl-6 align-middle font-normal text-sm text-light-secondary-text whitespace-nowrap font-public-sans">#{r.id}</td>
              <td className="px-3 py-3.5 align-middle text-sm text-light-secondary-text whitespace-nowrap font-public-sans">{r.order_number}</td>
              <td className="px-3 py-3.5 align-middle text-sm text-light-secondary-text whitespace-nowrap font-public-sans">{r.customer || '—'}</td>
              <td className="px-3 py-3.5 align-middle text-sm text-light-secondary-text whitespace-nowrap font-public-sans">{r.kind_label}</td>
              <td className="px-3 py-3.5 align-middle text-sm font-medium text-light-primary-text whitespace-nowrap font-dm-sans">
                {money.format(Number(r.amount))}{r.partial && <span className="ml-1 text-[10px] text-light-disabled-text">partial</span>}
              </td>
              <td className="px-3 py-3.5 align-middle text-sm text-light-secondary-text whitespace-nowrap max-w-[180px] font-public-sans">
                <p className="line-clamp-2" title={r.reason}>{r.reason || '—'}</p>
              </td>
              <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                <Pill label={labelize(r.status)} tone={refundTone(r.status)} solid />
              </td>
              <td className="px-3 py-3.5 align-middle text-sm text-light-secondary-text whitespace-nowrap font-public-sans">{date(r.created_at)}</td>
              <td className="px-3 py-3.5 align-middle pr-6 whitespace-nowrap">
                <div className="flex gap-2 items-center">
                  {r.status === 'requested' ? (
                    <>
                      <form action={approveAction.bind(null, r.id)}>
                        <button data-manage type="submit" className={primaryBtn}>Approve</button>
                      </form>
                      <form action={rejectAction.bind(null, r.id)}>
                        <button data-manage type="submit" className={dangerBtn}>Reject</button>
                      </form>
                    </>
                  ) : (
                    <span className="text-[11px] text-light-disabled-text font-public-sans">
                      {r.resolved_by ? `by ${r.resolved_by}` : '—'}
                    </span>
                  )}
                  <Link href={`/refunds/${r.id}`} className={outlineBtn}>View Details</Link>
                </div>
              </td>
            </tr>
          ))}
          {refunds.length === 0 && (
            <tr><td colSpan={9} className="text-center py-10 text-sm text-light-secondary-text font-public-sans">{emptyLabel}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
