'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, PackageCheck, Search } from 'lucide-react';
import type { AdminOrder } from '@/lib/admin-types';
import { moneyFormatter } from '@/lib/money';
import {
  StatusPill, TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH,
} from '@/components/sellzy/product-ui';
import { countryName } from '@/lib/countries';
import { paymentLabel } from '@/lib/order-stages';
import Flag from '@/components/Flag';

export type QueueExtraField = {
  name: string;
  label: string;
  type?: 'text' | 'number';
  placeholder?: string;
};

export type BulkOutcome = {
  updated: string[];
  failed: { number: string; detail: string }[];
};

/**
 * One stage of the fulfilment pipeline: a worklist, row selection with a
 * select-all in the header, and a single bulk action that hands the batch to
 * the next stage. Orders leave the list on the next load, so the bar reports
 * exactly what moved and what didn't before they go.
 */
export default function OrderQueue({
  orders,
  title,
  subtitle,
  emptyLabel,
  actionLabel,
  extraFields = [],
  currencyCode,
  locale,
  moveAction,
}: {
  orders: AdminOrder[];
  title: string;
  /** Where this queue sits on the line — "Stage 2 of 4". */
  subtitle?: string;
  emptyLabel: string;
  actionLabel: string;
  /** Optional inputs applied to the whole batch (carrier, weight, …). */
  extraFields?: QueueExtraField[];
  currencyCode: string;
  locale: string;
  moveAction: (formData: FormData) => Promise<BulkOutcome | { error: string } | void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const money = useMemo(
    () => moneyFormatter({ currency_code: currencyCode, locale }),
    [locale, currencyCode],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      `${o.number} ${o.email} ${o.phone} ${o.shipping_city} ${countryName(o.shipping_country)}`
        .toLowerCase()
        .includes(q),
    );
  }, [orders, query]);

  const allShownSelected = visible.length > 0 && visible.every((o) => selected.includes(o.number));

  function toggleAll() {
    setSelected(allShownSelected ? [] : visible.map((o) => o.number));
  }

  function toggle(number: string) {
    setSelected((list) =>
      list.includes(number) ? list.filter((n) => n !== number) : [...list, number],
    );
  }

  function submit(formData: FormData) {
    setError(null);
    setOutcome(null);
    for (const number of selected) formData.append('numbers', number);
    startTransition(async () => {
      const result = await moveAction(formData);
      if (!result) return;
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setOutcome(result);
      // Anything that moved has left this queue; keep the rejects ticked so
      // they stay visible and can be retried or opened.
      setSelected((list) => list.filter((n) => result.failed.some((f) => f.number === n)));
    });
  }

  return (
    <form action={submit} className="w-full rounded-2xl bg-surface">
      <div className="flex flex-col gap-4 p-4 sm:p-6 sm:pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-bold leading-7 text-light-primary-text font-public-sans">{title}</h3>
          <p className="text-xs text-light-secondary-text font-public-sans">
            {orders.length} order{orders.length === 1 ? '' : 's'} waiting{subtitle ? ` · ${subtitle}` : ''}
          </p>
        </div>
        <div className="relative w-full sm:w-[300px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-light-primary-text" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            /* This box lives inside the bulk-move form, so Enter here used to
               submit the batch. Filtering is live; Enter has nothing to do. */
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            aria-label="Search this queue"
            placeholder="Search this queue…"
            className="h-9 w-full rounded-full border-none bg-gray-100 py-2 pl-9 pr-3.5 text-sm font-normal text-light-primary-text ring ring-gray-500/20 transition-all placeholder:text-light-secondary-text focus:outline-none focus:ring-primary font-public-sans"
          />
        </div>
      </div>

      {/* ─── Bulk bar ───────────────────────────── */}
      <div className="flex flex-col gap-3 border-y border-gray-500/20 bg-gray-50 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <span className="text-sm font-semibold text-light-primary-text font-public-sans">
          {selected.length === 0 ? 'Select orders to move them on' : `${selected.length} selected`}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {extraFields.map((field) => (
            <input
              key={field.name}
              name={field.name}
              type={field.type ?? 'text'}
              min={field.type === 'number' ? '0' : undefined}
              placeholder={field.placeholder ?? field.label}
              aria-label={field.label}
              className="h-9 w-32 rounded-full border border-gray-300 px-3.5 text-sm text-light-primary-text focus:border-primary focus:outline-none font-public-sans"
            />
          ))}
          <button
            data-manage
            type="submit"
            disabled={selected.length === 0 || pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-6 py-1 text-sm font-bold leading-6 text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50 font-public-sans"
          >
            <PackageCheck size={14} />
            {pending ? 'Moving…' : actionLabel}
          </button>
        </div>
      </div>

      {(error || outcome) && (
        <div className="space-y-2 px-4 py-3 sm:px-6">
          {error && (
            <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{error}</p>
          )}
          {outcome && outcome.updated.length > 0 && (
            <p className="flex items-center gap-2 rounded-xl bg-primary-lighter/30 px-4 py-3 text-sm text-primary-dark font-public-sans">
              <Check size={16} />
              {outcome.updated.length} order{outcome.updated.length === 1 ? '' : 's'} moved on.
            </p>
          )}
          {outcome && outcome.failed.length > 0 && (
            <div className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning-dark font-public-sans">
              <p className="mb-1 flex items-center gap-2 font-semibold">
                <AlertTriangle size={16} />
                {outcome.failed.length} could not move:
              </p>
              <ul className="space-y-0.5 pl-6">
                {outcome.failed.map((f) => (
                  <li key={f.number}>
                    <Link href={`/orders/${f.number}`} className="font-semibold underline">#{f.number}</Link>
                    {' — '}{f.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <PackageCheck size={28} className="text-gray-400" />
          <p className="text-sm font-semibold text-light-primary-text font-public-sans">
            {orders.length === 0 ? emptyLabel : 'No orders match that search'}
          </p>
          <p className="text-xs text-light-secondary-text font-public-sans">
            {orders.length === 0 ? 'Orders arrive here as soon as the previous stage hands them over.' : 'Try clearing the search.'}
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <th className={`${TABLE_TH} w-[50px]`}>
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={toggleAll}
                    aria-label="Select every order in this queue"
                    className="size-4 accent-primary"
                  />
                </th>
                <th className={TABLE_TH}>Order</th>
                <th className={TABLE_TH}>Customer</th>
                <th className={TABLE_TH}>Destination</th>
                <th className={TABLE_TH}>Items</th>
                <th className={TABLE_TH}>Amount</th>
                <th className={TABLE_TH}>Payment</th>
                <th className={TABLE_TH}>Placed</th>
                <th className={TABLE_TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const items = o.items.reduce((sum, i) => sum + i.quantity, 0);
                const checked = selected.includes(o.number);
                return (
                  <tr key={o.id} className={`${TABLE_ROW} ${checked ? 'bg-primary-lighter/20' : ''}`}>
                    <td className={TABLE_TD}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(o.number)}
                        aria-label={`Select order ${o.number}`}
                        className="size-4 accent-primary"
                      />
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm font-semibold text-light-primary-text`}>
                      #{o.number}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm text-light-secondary-text`}>
                      {o.email || o.phone || '—'}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm text-light-secondary-text`}>
                      <span
                        className="inline-flex items-center gap-1.5"
                        title={countryName(o.shipping_country) || 'No shipping address'}
                      >
                        <Flag code={o.shipping_country} />
                        {o.shipping_city || countryName(o.shipping_country) || '—'}
                      </span>
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm tabular-nums text-light-secondary-text`}>
                      {items}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap font-dm-sans text-sm font-semibold text-primary`}>
                      {money(o.grand_total, o.currency)}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}>
                      {/* COD sits on the warehouse queue unpaid by design, so
                          "Pending" would read as something to chase. */}
                      {/* One vocabulary for payment, shared with the list and
                          the order page — see lib/order-stages. */}
                      <StatusPill
                        label={paymentLabel(o.payment_status)}
                        tone={o.payment_status === 'paid' ? 'success' : o.payment_status === 'due_on_delivery' ? 'info' : 'warning'}
                      />
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm text-light-secondary-text`}>
                      {new Date(o.placed_at || o.created_at).toLocaleDateString(locale, {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}>
                      <Link href={`/orders/${o.number}`} className="text-xs font-semibold text-primary font-public-sans">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
