'use client';

import { useMemo, useState } from 'react';
import type { AdminReview } from '@/lib/admin-types';
import { storefrontUrl } from '@/lib/storefront';
import {
  IconAction, Pagination, SearchBox, StatusPill, FilterPill,
  TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH,
} from '@/components/sellzy/product-ui';
import { BadgeCheck, Check, ExternalLink, MessageSquare, Star, Trash2, Undo2 } from 'lucide-react';

const PAGE_SIZE = 8;

type Action = (formData: FormData) => void | Promise<void>;

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          className={i <= rating ? 'text-warning' : 'text-gray-300'}
          fill={i <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

export default function ReviewsClient({
  reviews,
  total,
  approveAction,
  rejectAction,
  deleteAction,
}: {
  reviews: AdminReview[];
  total: number;
  approveAction: Action;
  rejectAction: Action;
  deleteAction: Action;
}) {
  const [query, setQuery] = useState('');
  const [rating, setRating] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (statusFilter === 'pending' && r.is_approved) return false;
      if (statusFilter === 'approved' && !r.is_approved) return false;
      if (rating && r.rating !== Number(rating)) return false;
      if (query && !`${r.product_name} ${r.display_name} ${r.title} ${r.body}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [reviews, query, rating, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-surface rounded-2xl w-full">
      <div className="p-4 sm:p-6 pb-4">
        <h3 className="text-lg sm:text-xl mb-4 sm:mb-6 font-bold text-light-primary-text leading-7.5 font-public-sans">Product Review</h3>
        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
          <SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search product, reviewer, text…" />
          <div className="flex items-center gap-3 flex-wrap">
            <FilterPill
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: '', label: 'Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Published' },
              ]}
            />
            <FilterPill
              value={rating}
              onChange={(v) => { setRating(v); setPage(1); }}
              options={[
                { value: '', label: 'Rating' },
                { value: '5', label: '5 stars' },
                { value: '4', label: '4 stars' },
                { value: '3', label: '3 stars' },
                { value: '2', label: '2 stars' },
                { value: '1', label: '1 star' },
              ]}
            />
          </div>
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <MessageSquare size={28} className="text-gray-400" />
          <p className="text-sm font-semibold text-light-primary-text font-public-sans">
            {statusFilter === 'pending' ? 'No reviews awaiting moderation' : 'No reviews match this filter'}
          </p>
          <p className="text-xs text-light-secondary-text font-public-sans">Try clearing the search or filters.</p>
        </div>
      ) : (
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <th className={TABLE_TH}>ID</th>
                <th className={TABLE_TH}>Product</th>
                <th className={TABLE_TH}>User</th>
                <th className={TABLE_TH}>Review</th>
                <th className={TABLE_TH}>Rating</th>
                <th className={TABLE_TH}>Status</th>
                <th className={TABLE_TH}>Date</th>
                <th className={TABLE_TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.id} className={TABLE_ROW}>
                  <td className={`${TABLE_TD} font-normal text-sm text-light-secondary-text whitespace-nowrap`}>#{r.id}</td>
                  <td className={`${TABLE_TD} whitespace-nowrap`}>
                    <span className="text-sm text-light-secondary-text font-public-sans">{r.product_name}</span>
                  </td>
                  <td className={`${TABLE_TD} text-light-secondary-text whitespace-nowrap`}>
                    {r.display_name}
                    {r.is_verified_purchase && (
                      <BadgeCheck size={12} className="inline ml-1 -mt-0.5 text-success" aria-label="Verified purchase" />
                    )}
                  </td>
                  <td className={`${TABLE_TD} max-w-[220px] truncate text-light-secondary-text`} title={r.body}>
                    {r.title ? `${r.title} — ${r.body}` : r.body}
                  </td>
                  <td className={TABLE_TD}><Stars rating={r.rating} /></td>
                  <td className={`${TABLE_TD} whitespace-nowrap`}>
                    <StatusPill label={r.is_approved ? 'Published' : 'Pending'} tone={r.is_approved ? 'success' : 'warning'} />
                  </td>
                  <td className={`${TABLE_TD} text-light-secondary-text whitespace-nowrap`}>
                    {new Date(r.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className={`${TABLE_TD} whitespace-nowrap`}>
                    <div className="flex items-center gap-1">
                      <IconAction
                        href={storefrontUrl(`/product/${r.product_slug}`)}
                        external
                        title="View on storefront"
                      >
                        <ExternalLink size={16} />
                      </IconAction>
                      {/* Moderation — hidden for a role that can only view. */}
                      <span data-manage className="contents">
                      {r.is_approved ? (
                        <form action={rejectAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <IconAction type="submit" title="Unpublish"><Undo2 size={16} /></IconAction>
                        </form>
                      ) : (
                        <form action={approveAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <IconAction type="submit" title="Approve & publish"><Check size={16} /></IconAction>
                        </form>
                      )}
                      {confirmDelete === r.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <form action={deleteAction} onSubmit={() => setConfirmDelete(null)}>
                            <input type="hidden" name="id" value={r.id} />
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
                        <IconAction onClick={() => setConfirmDelete(r.id)} title="Delete" danger>
                          <Trash2 size={16} />
                        </IconAction>
                      )}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 sm:p-6 border-t border-gray-500/20 flex items-center justify-between">
        <span className="text-xs text-light-secondary-text font-public-sans">Showing {pageItems.length} of {total} reviews</span>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
