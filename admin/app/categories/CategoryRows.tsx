'use client';

import { useMemo, useState, useTransition } from 'react';
import type { AdminCategory } from '@/lib/admin-types';
import {
  FloatingInput, FloatingSelect, FloatingTextarea, IconAction, Pagination, PillButton,
  SearchBox, StatusPill, FilterPill, TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH,
} from '@/components/sellzy/product-ui';
import { Eye, EyeOff, FolderTree, Pencil, UploadCloud, X } from 'lucide-react';
import ViewToggle, { useViewPreference } from '@/components/ui/ViewToggle';

const PAGE_SIZE = { grid: 24, table: 8 } as const;

type Action = (formData: FormData) => Promise<{ error?: string } | void>;

function CategoryModal({
  category,
  categories,
  action,
  onClose,
}: {
  category: AdminCategory | null;
  categories: AdminCategory[];
  action: Action;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(category);

  /* The modal used to close on any outcome, so a rejected save looked exactly
     like a successful one. */
  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl w-full max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans">
            {isEdit ? 'Edit Category' : 'Create New Categories'}
          </h2>
          <button type="button" onClick={onClose} className="size-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-light-primary-text">
            <X size={16} />
          </button>
        </div>

        <form action={submit} className="space-y-4 sm:space-y-6">
          {isEdit && <input type="hidden" name="slug" value={category!.slug} />}

          <div className="w-full mx-auto">
            <label className="group relative flex h-full min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-surface p-6 text-center transition-colors hover:bg-gray-50">
              <input type="file" name="image" accept="image/*" aria-label="Category icon or image" className="sr-only" />
              {category?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={category.image_url} alt={category.name} className="size-16 rounded-lg object-cover mb-2" />
              ) : (
                <UploadCloud size={32} className="text-light-secondary-text mb-2" />
              )}
              <p className="text-sm font-semibold text-light-secondary-text font-public-sans">Upload Icon/ image</p>
              <p className="text-xs text-light-secondary-text font-public-sans">Allowed *.jpeg, *.jpg, *.png, *.gif · Max 3.1 MB</p>
            </label>
          </div>

          <FloatingInput label="Categories Name" name="name" defaultValue={category?.name} required />

          <FloatingSelect
            label="Parent Category"
            name="parent"
            defaultValue={category?.parent ?? ''}
            options={[
              { value: '', label: 'None (top-level)' },
              ...categories.filter((c) => c.id !== category?.id).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <FloatingInput label="Sort order" name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} />

          <FloatingTextarea label="Description" name="description" defaultValue={category?.description} rows={4} />

          {error && (
            <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <PillButton type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</PillButton>
            <PillButton type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</PillButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoryRows({
  categories,
  createAction,
  updateAction,
}: {
  categories: AdminCategory[];
  createAction: Action;
  updateAction: Action;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  // Categories are picked by their picture on the storefront; they are found
  // by it here too.
  const [view, setView] = useViewPreference('categories', 'grid');
  const [modal, setModal] = useState<'create' | AdminCategory | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return categories.filter((c) => {
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (status === 'active' && !c.is_active) return false;
      if (status === 'hidden' && c.is_active) return false;
      return true;
    });
  }, [categories, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE[view]));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE[view], page * PAGE_SIZE[view]);

  function toggleActive(c: AdminCategory) {
    const fd = new FormData();
    fd.set('slug', c.slug);
    fd.set('is_active', String(!c.is_active));
    startTransition(() => { void updateAction(fd); });
  }

  return (
    <div className="bg-surface rounded-2xl w-full">
      <div className="p-4 sm:p-6 pb-4">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-light-primary-text leading-7.5 font-public-sans">Categories List</h3>
          <PillButton onClick={() => setModal('create')}>
            <FolderTree size={14} />Create Categories
          </PillButton>
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
          <SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search categories…" />
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterPill
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: '', label: 'Status' },
                { value: 'active', label: 'Active' },
                { value: 'hidden', label: 'Hidden' },
              ]}
            />
            <ViewToggle view={view} onChange={(next) => { setView(next); setPage(1); }} label="How categories are shown" />
          </div>
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <FolderTree size={28} className="text-gray-400" />
          <p className="text-sm font-semibold text-light-primary-text font-public-sans">No categories match this filter</p>
          <p className="text-xs text-light-secondary-text font-public-sans">Try clearing the search or filters.</p>
        </div>
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-2 gap-3 px-4 sm:gap-4 sm:px-6 md:grid-cols-3 xl:grid-cols-5">
          {pageItems.map((c) => (
            <li key={c.id} className="ak-product-tile" style={{ padding: 10, cursor: 'default' }}>
              {/* A category is chosen by its picture on the storefront, so it
                  is found by its picture here too. The table showed it at 32px. */}
              <div
                className="mb-2 flex items-center justify-center overflow-hidden rounded-lg"
                style={{ aspectRatio: '4 / 3', background: 'var(--surface-2)' }}
              >
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FolderTree size={22} style={{ color: 'var(--text-3)' }} />
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-1)' }} title={c.name}>
                  {c.name}
                </p>
                <StatusPill label={c.is_active ? 'Active' : 'Hidden'} tone={c.is_active ? 'success' : 'neutral'} />
              </div>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-3)' }}>
                #{c.legacy_id || c.id} · sort {c.sort_order}
              </p>
              <div className="mt-2 flex items-center justify-end gap-1 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                <IconAction onClick={() => setModal(c)} title="Edit category"><Pencil size={15} /></IconAction>
                <IconAction onClick={() => toggleActive(c)} title={c.is_active ? 'Hide category' : 'Show category'}>
                  {c.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </IconAction>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <th className={TABLE_TH}>ID</th>
                <th className={TABLE_TH}>Icon/ image</th>
                <th className={TABLE_TH}>Category Name</th>
                <th className={TABLE_TH}>Status</th>
                <th className={TABLE_TH}>Sort</th>
                <th className={TABLE_TH}>Date</th>
                <th className={TABLE_TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.id} className={TABLE_ROW}>
                  <td className={`${TABLE_TD} font-normal text-sm text-light-secondary-text whitespace-nowrap`}>
                    #{c.legacy_id || c.id}
                  </td>
                  <td className={TABLE_TD}>
                    <div className="size-8 relative rounded-lg overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                      {c.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt={c.name} className="object-cover w-full h-full" />
                      ) : (
                        <FolderTree size={14} className="text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className={`${TABLE_TD} text-sm text-light-secondary-text whitespace-nowrap`}>{c.name}</td>
                  <td className={`${TABLE_TD} whitespace-nowrap`}>
                    <StatusPill label={c.is_active ? 'Active' : 'Hidden'} tone={c.is_active ? 'success' : 'neutral'} />
                  </td>
                  <td className={`${TABLE_TD} text-sm text-light-secondary-text tabular-nums whitespace-nowrap`}>{c.sort_order}</td>
                  <td className={`${TABLE_TD} text-sm text-light-secondary-text whitespace-nowrap`}>
                    {new Date(c.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className={`${TABLE_TD} whitespace-nowrap`}>
                    <div className="flex items-center justify-start gap-1">
                      <IconAction onClick={() => setModal(c)} title="Edit category"><Pencil size={16} /></IconAction>
                      <IconAction onClick={() => toggleActive(c)} title={c.is_active ? 'Hide category' : 'Show category'}>
                        {c.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </IconAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 sm:p-6 border-t border-gray-500/20 flex items-center justify-between">
        <span className="text-xs text-light-secondary-text font-public-sans">Showing {pageItems.length} of {filtered.length} categories</span>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {modal && (
        <CategoryModal
          category={modal === 'create' ? null : modal}
          categories={categories}
          action={modal === 'create' ? createAction : updateAction}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
