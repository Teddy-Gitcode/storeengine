'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AdminCustomer } from '@/lib/admin-types';
import ExportCsvButton from '@/components/ExportCsvButton';
import { Eye, Mail, Pencil, Phone, Plus, Search } from 'lucide-react';
import ViewToggle, { useViewPreference } from '@/components/ui/ViewToggle';

function displayName(c: AdminCustomer) {
  const { first_name, last_name, email } = c.user;
  const full = `${first_name} ${last_name}`.trim();
  return full || email.split('@')[0];
}

function initials(c: AdminCustomer) {
  const name = displayName(c);
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'C';
}

function joinedLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

type StatusFilter = 'all' | 'active' | 'inactive';
type DateSort = 'newest' | 'oldest';

export default function CustomersClient({
  initialCustomers,
}: {
  initialCustomers: AdminCustomer[];
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [dateSort, setDateSort] = useState<DateSort>('newest');
  // People read as cards: a face or initials is the fastest way to find one.
  const [view, setView] = useViewPreference('customers', 'grid');
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let base = query
      ? initialCustomers.filter(
          (c) =>
            displayName(c).toLowerCase().includes(q) ||
            c.user.email.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            c.legacy_id.includes(q),
        )
      : [...initialCustomers];
    if (status !== 'all') {
      base = base.filter((c) => (status === 'active' ? c.user.is_active : !c.user.is_active));
    }
    base.sort((a, b) =>
      dateSort === 'newest'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return base;
  }, [query, status, dateSort, initialCustomers]);

  return (
    <div className="bg-surface rounded-2xl w-full">
      <div className="p-4 sm:p-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <h3 className="text-xl font-bold font-public-sans text-light-primary-text leading-7">Customers</h3>
          <div className="flex items-center gap-3">
            <ExportCsvButton
              filename="customers.csv"
              label="Export"
              headers={['ID', 'Name', 'Email', 'Phone', 'Orders', 'Country', 'Marketing opt-in', 'Joined']}
              rows={filtered.map((c) => {
                const addr = c.addresses.find((a) => a.is_default) || c.addresses[0];
                return [
                  c.id,
                  displayName(c),
                  c.user.email,
                  c.phone,
                  c.orders_count,
                  addr?.country_code || '',
                  c.marketing_opt_in ? 'yes' : 'no',
                  new Date(c.created_at).toISOString().slice(0, 10),
                ];
              })}
            />
            <Link
              href="/customers/add"
              className="inline-flex items-center justify-center gap-1.5 cursor-pointer font-bold font-public-sans transition-colors focus:outline-none rounded-full bg-primary text-white hover:bg-primary-dark px-6 py-1 h-9 text-sm leading-6"
            >
              <Plus size={14} />
              Create Customer
            </Link>
          </div>
        </div>

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
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-9 ring text-sm ring-[rgba(145,158,171,0.20)] cursor-pointer rounded-full bg-gray-200 pl-3 pr-8 font-public-sans text-light-secondary-text focus:outline-none"
            >
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value as DateSort)}
              className="h-9 ring text-sm ring-[rgba(145,158,171,0.20)] cursor-pointer rounded-full bg-gray-200 pl-3 pr-8 font-public-sans text-light-secondary-text focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <ViewToggle view={view} onChange={setView} label="How customers are shown" />
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        filtered.length === 0 ? (
          <div className="ak-empty py-14 text-center text-sm">
            {initialCustomers.length === 0 ? 'No customers yet — they appear here after sign-up' : 'No customers match this filter'}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:gap-4 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => (
              <li key={c.id} className="ak-product-tile" style={{ padding: 14, cursor: 'default' }}>
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-lighter font-dm-sans text-sm font-bold text-primary-dark">
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      initials(c)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-1)' }} title={displayName(c)}>{displayName(c)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>#{c.id} · joined {joinedLabel(c.created_at)}</p>
                  </div>

                </div>

                <div className="mt-2.5 space-y-1">
                  <p className="flex items-center gap-1.5 truncate text-[11.5px]" style={{ color: 'var(--text-2)' }}>
                    <Mail size={11} className="shrink-0" style={{ color: 'var(--text-3)' }} />
                    <span className="truncate">{c.user.email}</span>
                  </p>
                  {c.phone && (
                    <p className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--text-2)' }}>
                      <Phone size={11} className="shrink-0" style={{ color: 'var(--text-3)' }} />
                      {c.phone}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                  <span
                    className={`mr-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium font-public-sans ${
                      c.user.is_active ? 'bg-primary/16 text-primary-dark' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {c.user.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Link href={`/customers/${c.id}`} title="View customer" className="ak-icon-btn" style={{ color: 'var(--text-2)' }}>
                    <Eye size={15} />
                  </Link>
                  <Link href={`/customers/edit/${c.id}`} title="Edit customer" className="ak-icon-btn" style={{ color: 'var(--text-2)' }}>
                    <Pencil size={15} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="bg-gray-100 border-y border-gray-500/20">
              {['ID', 'Customer', 'Email', 'Phone Number', 'Status', 'Joined', 'Action'].map((h) => (
                <th
                  key={h}
                  className="h-12 p-3 first:pl-6 whitespace-nowrap last:pr-6 text-left align-middle text-light-primary-text text-sm font-semibold font-public-sans"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm font-public-sans text-light-secondary-text">
                  {initialCustomers.length === 0 ? 'No customers yet — they appear here after sign-up' : 'No customers match this filter'}
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const name = displayName(c);
                return (
                  <tr key={c.id} className="border-b last:border-0 border-gray-500/20 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3.5 pl-6 align-middle text-sm font-normal font-public-sans text-light-secondary-text whitespace-nowrap">
                      #{c.id}
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="size-8 relative rounded-lg shrink-0 overflow-hidden bg-primary-lighter text-primary-dark flex items-center justify-center font-dm-sans font-bold text-xs">
                          {c.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- backend media host, not in next.config images
                            <img src={c.avatar_url} alt="" className="size-full object-cover" />
                          ) : (
                            initials(c)
                          )}
                        </div>
                        <span className="text-sm font-public-sans text-light-secondary-text">{name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-public-sans text-light-secondary-text whitespace-nowrap">
                      {c.user.email}
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-public-sans text-light-secondary-text whitespace-nowrap">
                      {c.phone || '—'}
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <span
                        className={`px-2 py-1 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium ${
                          c.user.is_active ? 'bg-primary/16 text-primary-dark' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {c.user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm font-dm-sans text-light-secondary-text whitespace-nowrap">
                      {joinedLabel(c.created_at)}
                    </td>
                    <td className="px-3 py-3.5 pr-6 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/customers/${c.id}`}
                          title="View customer"
                          className="size-8 flex items-center justify-center rounded-lg text-light-primary-text transition-colors hover:bg-gray-100"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/customers/edit/${c.id}`}
                          title="Edit customer"
                          className="size-8 flex items-center justify-center rounded-lg text-light-primary-text transition-colors hover:bg-gray-100"
                        >
                          <Pencil size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      <div className="mt-4 p-4 sm:p-6 border-t border-gray-500/20 flex items-center justify-between">
        <span className="text-xs font-public-sans text-light-secondary-text">
          Showing {filtered.length} of {initialCustomers.length} customers
        </span>
      </div>
    </div>
  );
}
