'use client';

import { useMemo, useState } from 'react';
import type { Promotion } from '@/lib/admin-types';
import Link from 'next/link';
import { Search, Pencil, Play, Pause, Square, Trash2, Globe } from 'lucide-react';
import CopyCodeButton from './CopyCodeButton';

type Action = (formData: FormData) => void | Promise<void>;

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-primary/16 text-primary-dark',
  scheduled: 'bg-secondary/16 text-secondary-dark',
  ended: 'bg-gray-200 text-gray-700',
  paused: 'bg-warning/16 text-warning-dark',
  draft: 'bg-gray-200 text-gray-700',
};

function statusBadge(status: string) {
  return STATUS_BADGE[status] ?? 'bg-gray-200 text-gray-700';
}

function scheduleLabel(starts: string | null | undefined, ends: string | null | undefined, locale: string) {
  if (!starts && !ends) return { start: 'Ongoing', end: '—' };
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const start = starts ? new Date(starts).toLocaleDateString(locale, opts) : 'Now';
  const end = ends ? new Date(ends).toLocaleDateString(locale, opts) : 'Open';
  return { start, end };
}

function amountLabel(promo: Promotion, money: Intl.NumberFormat) {
  if (promo.promotion_type === 'percentage') return `${promo.value}%`;
  if (promo.promotion_type === 'free_shipping') return 'Free shipping';
  if (promo.promotion_type === 'bogo') return 'BOGO';
  return money.format(Number(promo.value));
}

const selectClass =
  'h-9 ring text-sm ring-[rgba(145,158,171,0.20)] cursor-pointer rounded-full bg-gray-200 pl-3 pr-8 font-public-sans text-light-secondary-text focus:outline-none';
export default function PromoRows({
  promos,
  setStatusAction,
  deleteAction,
  currencyCode = 'USD',
  locale = 'en-US',
}: {
  promos: Promotion[];
  setStatusAction: Action;
  deleteAction: Action;
  currencyCode?: string;
  locale?: string;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }),
    [locale, currencyCode],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return promos.filter((p) => {
      if (q && !(p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))) return false;
      if (status && p.status !== status) return false;
      if (type && p.promotion_type !== type) return false;
      return true;
    });
  }, [promos, query, status, type]);

  return (
    <div className="bg-surface rounded-2xl w-full">
      <div className="p-4 sm:p-6 pb-4">
        <div className="w-full flex justify-between gap-4 items-center flex-wrap">
          <div className="relative sm:w-[300px] w-full">
            <Search size={14} className="absolute text-light-primary-text left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 w-full pr-3.5 ring h-9 ring-gray-500/20 py-2 bg-gray-100 border-none rounded-full text-sm focus:outline-none focus:ring-primary transition-all font-normal font-public-sans text-light-primary-text placeholder:text-light-secondary-text"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="">Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
              <option value="">Type</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
              <option value="free_shipping">Free shipping</option>
              <option value="bogo">Buy one get one</option>
              <option value="featured">Featured</option>
            </select>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="bg-gray-100 border-y border-gray-500/20">
              {['Title', 'Code', 'Amount', 'Applies to', 'Used', 'Runs', 'Status', 'Action'].map((h) => (
                <th key={h} className="h-12 p-3 first:pl-6 whitespace-nowrap last:pr-6 text-left align-middle text-light-primary-text text-sm font-semibold font-public-sans">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-sm font-public-sans text-light-secondary-text">
                  {promos.length === 0 ? 'No discounts yet' : 'No discounts match this filter'}
                </td>
              </tr>
            ) : (
              filtered.map((promo) => {
                const sched = scheduleLabel(promo.starts_at, promo.ends_at, locale);
                return (
                  <tr key={promo.id} className="border-b last:border-0 border-gray-500/20 hover:bg-gray-50/50 transition-colors">
                    {/* The id moved under the title: a column of "#1, #2…" took
                        width the action buttons needed, which were clipped. */}
                    <td className="px-3 py-3.5 pl-6 align-middle text-sm font-public-sans text-light-primary-text whitespace-nowrap">
                      {promo.name}
                      <span className="block text-[11px] text-light-secondary-text">#{promo.id}</span>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="font-dm-sans font-bold text-xs text-primary-dark bg-primary-lighter px-2 py-0.5 rounded">
                          {promo.code || '—'}
                        </span>
                        {promo.is_sitewide && <Globe size={11} className="text-light-secondary-text" />}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-dm-sans font-semibold text-light-primary-text whitespace-nowrap">
                      {amountLabel(promo, money)}
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-public-sans text-light-secondary-text whitespace-nowrap">
                      {promo.applies_to || 'Any eligible product'}
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-dm-sans whitespace-nowrap">
                      <span className="font-semibold text-light-primary-text">{promo.usage_count}</span>
                      <span className="text-light-secondary-text"> / {promo.usage_limit ?? 'no limit'}</span>
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-public-sans text-light-secondary-text whitespace-nowrap">
                      {sched.start}
                      {sched.end !== '—' && sched.end !== 'Open' && <span className="block text-[11px]">until {sched.end}</span>}
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <span className={`px-2 py-1 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium ${statusBadge(promo.status)}`}>
                        {promo.status_label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 pr-6 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <CopyCodeButton code={promo.code || promo.name} />
                        {/* Edit, status and delete — hidden for a role that can only view. */}
                        <span data-manage className="contents">
                        <Link
                          href={`/coupon/edit/${promo.id}`}
                          title="Edit"
                          className="inline-flex items-center justify-center cursor-pointer font-bold focus:outline-none rounded-lg hover:bg-gray-100 h-8 w-8 p-0 text-light-primary-text hover:text-primary transition-colors"
                        >
                          <Pencil size={14} />
                        </Link>
                        {promo.status !== 'active' && (
                          <form action={setStatusAction}>
                            <input type="hidden" name="id" value={promo.id} />
                            <input type="hidden" name="status" value="active" />
                            <button
                              type="submit"
                              title="Activate"
                              className="inline-flex items-center justify-center cursor-pointer font-bold focus:outline-none rounded-lg hover:bg-gray-100 h-8 w-8 p-0 text-light-primary-text hover:text-primary transition-colors"
                            >
                              <Play size={14} />
                            </button>
                          </form>
                        )}
                        {promo.status === 'active' && (
                          <form action={setStatusAction}>
                            <input type="hidden" name="id" value={promo.id} />
                            <input type="hidden" name="status" value="paused" />
                            <button
                              type="submit"
                              title="Pause"
                              className="inline-flex items-center justify-center cursor-pointer font-bold focus:outline-none rounded-lg hover:bg-gray-100 h-8 w-8 p-0 text-light-primary-text hover:text-primary transition-colors"
                            >
                              <Pause size={14} />
                            </button>
                          </form>
                        )}
                        {promo.status !== 'ended' && (
                          <form action={setStatusAction}>
                            <input type="hidden" name="id" value={promo.id} />
                            <input type="hidden" name="status" value="ended" />
                            <button
                              type="submit"
                              title="End"
                              className="inline-flex items-center justify-center cursor-pointer font-bold focus:outline-none rounded-lg hover:bg-gray-100 h-8 w-8 p-0 text-light-primary-text hover:text-primary transition-colors"
                            >
                              <Square size={14} />
                            </button>
                          </form>
                        )}
                        {confirmDelete === promo.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <form action={deleteAction} onSubmit={() => setConfirmDelete(null)}>
                              <input type="hidden" name="id" value={promo.id} />
                              <button
                                type="submit"
                                className="rounded-full bg-error px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-error-dark font-public-sans"
                              >
                                Delete
                              </button>
                            </form>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 font-public-sans"
                            >
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(promo.id)}
                            title="Delete"
                            className="inline-flex items-center justify-center cursor-pointer font-bold focus:outline-none rounded-lg hover:bg-gray-100 h-8 w-8 p-0 text-light-primary-text hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 sm:p-6 border-t border-gray-500/20 flex items-center justify-between">
        <span className="text-xs font-public-sans text-light-secondary-text">
          Showing {filtered.length} of {promos.length} discounts
        </span>
      </div>
    </div>
  );
}
