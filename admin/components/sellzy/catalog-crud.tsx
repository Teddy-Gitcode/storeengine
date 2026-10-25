'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import ViewToggle, { useViewPreference } from '@/components/ui/ViewToggle';

export type CrudItem = {
  slug: string;
  name: string;
  is_active: boolean;
  product_count: number;
  description?: string;
  logo_url?: string;
  values?: { id: number; value: string }[];
};

type Variant = 'tag' | 'brand' | 'attribute';

const th = 'p-3 first:pl-5 last:pr-5 text-left align-middle py-3 whitespace-nowrap font-semibold font-public-sans text-sm text-light-primary-text';
const cell = 'px-3 first:pl-5 last:pr-5 align-middle py-3.5';
const input = 'w-full h-11 px-4 rounded-full bg-gray-100 border border-gray-300 text-sm font-public-sans focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
const label = 'block text-xs font-semibold font-public-sans text-light-secondary-text mb-1.5';

function Fields({ variant, item }: { variant: Variant; item?: CrudItem }) {
  const uid = useId();
  return (
    <>
      <div>
        <label className={label} htmlFor={`${uid}-name`}>Name</label>
        <input id={`${uid}-name`} name="name" defaultValue={item?.name ?? ''} required className={input} placeholder={`e.g. ${variant === 'brand' ? 'Acme Co' : variant === 'attribute' ? 'Size' : 'Summer Sale'}`} />
      </div>
      {variant === 'brand' && (
        <div>
          <label className={label} htmlFor={`${uid}-description`}>Description</label>
          <input id={`${uid}-description`} name="description" defaultValue={item?.description ?? ''} className={input} placeholder="Short description (optional)" />
        </div>
      )}
      {variant === 'attribute' && (
        <div>
          <label className={label} htmlFor={`${uid}-values`}>Values <span className="font-normal text-light-disabled-text">(comma-separated)</span></label>
          <input id={`${uid}-values`} name="values" defaultValue={item?.values?.map((v) => v.value).join(', ') ?? ''} className={input} placeholder="Small, Medium, Large" />
        </div>
      )}
      <label className="inline-flex items-center gap-2 text-sm font-public-sans text-light-primary-text">
        <input type="checkbox" name="is_active" defaultChecked={item?.is_active ?? true} className="w-4 h-4 accent-primary" />
        Active
      </label>
    </>
  );
}

export default function CatalogCrud({
  title,
  singular,
  variant,
  items,
  columns,
  createAction,
  updateAction,
  deleteAction,
  formHrefBase,
}: {
  title: string;
  singular: string;
  variant: Variant;
  items: CrudItem[];
  columns: string[];
  /* Only needed for the inline forms — a resource with `formHrefBase` does its
     create/edit on dedicated pages and never calls these. */
  createAction?: (formData: FormData) => Promise<void>;
  updateAction?: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<{ error?: string } | void>;
  /* When set, create/edit go to dedicated pages (`<base>/add`, `<base>/<slug>/edit`)
     instead of the inline forms. */
  formHrefBase?: string;
}) {
  const [creating, setCreating] = useState(false);
  // Brands carry a logo, so they read as cards. Tags and attributes are names
  // and counts, which a row says more compactly — but both can be switched.
  const [view, setView] = useViewPreference(`catalog-${variant}`, variant === 'brand' ? 'grid' : 'table');
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div className="bg-surface border border-gray-500/20 rounded-2xl w-full">
      <div className="p-4 sm:p-6 pb-4 flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-light-primary-text leading-7 font-public-sans">{title}</h3>
        {formHrefBase ? (
          <Link
            href={`${formHrefBase}/add`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold font-public-sans bg-primary text-white hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} />New {singular}
          </Link>
        ) : (
          <button
            data-manage
            onClick={() => { setCreating((v) => !v); setEditing(null); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold font-public-sans bg-primary text-white hover:bg-primary-dark transition-colors"
          >
            {creating ? <X size={16} /> : <Plus size={16} />}{creating ? 'Close' : `New ${singular}`}
          </button>
        )}
        <ViewToggle view={view} onChange={setView} label={`How ${singular.toLowerCase()}s are shown`} />
      </div>

      {creating && !formHrefBase && (
        <form
          action={async (fd) => { await createAction?.(fd); setCreating(false); }}
          className="mx-4 sm:mx-6 mb-4 p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col gap-3"
        >
          <Fields variant={variant} />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 rounded-full text-sm font-medium font-public-sans text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-full text-sm font-semibold font-public-sans bg-primary text-white hover:bg-primary-dark">Create {singular}</button>
          </div>
        </form>
      )}

      {view === 'grid' ? (
        items.length === 0 ? (
          <div className="ak-empty py-14 text-center text-sm">
            No {singular.toLowerCase()}s yet — click “New {singular}” to add one.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 px-4 sm:gap-4 sm:px-6 md:grid-cols-3 xl:grid-cols-4">
            {items.map((it) =>
              /* The card being edited becomes the form, full width, in the
                 place the card was — so the row's inline editing survives the
                 change of shape rather than sending anyone to another screen. */
              editing === it.slug ? (
                <li key={it.slug} className="col-span-full rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <form action={async (fd) => { await updateAction?.(fd); setEditing(null); }} className="flex flex-col gap-3">
                    <input type="hidden" name="slug" value={it.slug} />
                    <Fields variant={variant} item={it} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditing(null)} className="rounded-full px-4 py-2 text-sm font-medium font-public-sans text-gray-600 hover:bg-gray-100">Cancel</button>
                      <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold font-public-sans text-white hover:bg-primary-dark">Save</button>
                    </div>
                  </form>
                </li>
              ) : (
                <li key={it.slug} className="ak-product-tile" style={{ padding: 12, cursor: 'default' }}>
                  {variant === 'brand' && (
                    <div
                      className="mb-2.5 flex items-center justify-center overflow-hidden rounded-lg"
                      style={{ aspectRatio: '16 / 10', background: '#F2F4F7' }}
                    >
                      {it.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.logo_url} alt="" className="h-full w-full object-contain p-3" />
                      ) : (
                        <span className="font-dm-sans text-xl font-bold" style={{ color: 'var(--text-3)' }}>
                          {it.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-1)' }}>{it.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium font-public-sans ${it.is_active ? 'bg-success/16 text-success-dark' : 'bg-gray-200 text-gray-600'}`}>
                      {it.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                    {variant === 'attribute'
                      ? (it.values?.length ? it.values.map((v) => v.value).join(', ') : '—')
                      : variant === 'brand'
                        ? (it.description || '—')
                        : it.slug}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="font-dm-sans text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                      {it.product_count} product{it.product_count === 1 ? '' : 's'}
                    </span>
                    {confirmDel === it.slug ? (
                      <span className="inline-flex items-center gap-1.5">
                        <form
                          action={async (fd) => {
                            setDeleteError(null);
                            const result = await deleteAction(fd);
                            if (result && 'error' in result && result.error) setDeleteError(result.error);
                            setConfirmDel(null);
                          }}
                          className="inline"
                        >
                          <input type="hidden" name="slug" value={it.slug} />
                          <button type="submit" className="rounded-full bg-error px-2.5 py-1 text-xs font-semibold font-public-sans text-white hover:bg-error-dark">Delete</button>
                        </form>
                        <button onClick={() => setConfirmDel(null)} className="rounded-full px-2.5 py-1 text-xs font-medium font-public-sans text-gray-600 hover:bg-gray-100">Keep</button>
                      </span>
                    ) : (
                      <span data-manage className="inline-flex items-center gap-1">
                        {formHrefBase ? (
                          <Link href={`${formHrefBase}/${it.slug}/edit`} className="flex size-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100" title="Edit">
                            <Pencil size={15} />
                          </Link>
                        ) : (
                          <button onClick={() => { setEditing(it.slug); setCreating(false); }} className="flex size-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100" title="Edit">
                            <Pencil size={15} />
                          </button>
                        )}
                        <button onClick={() => setConfirmDel(it.slug)} className="flex size-8 items-center justify-center rounded-full text-error hover:bg-error/10" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        )
      ) : (
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b border-[rgba(145,158,171,0.20)]">
              {columns.map((c) => <th key={c} className={th}>{c}</th>)}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {items.map((it) => (
              editing === it.slug ? (
                <tr key={it.slug} className="border-b border-[rgba(145,158,171,0.20)] bg-gray-50">
                  <td colSpan={columns.length} className="px-5 py-4">
                    <form action={async (fd) => { await updateAction?.(fd); setEditing(null); }} className="flex flex-col gap-3">
                      <input type="hidden" name="slug" value={it.slug} />
                      <Fields variant={variant} item={it} />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-full text-sm font-medium font-public-sans text-gray-600 hover:bg-gray-100">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-full text-sm font-semibold font-public-sans bg-primary text-white hover:bg-primary-dark">Save</button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={it.slug} className="border-b border-[rgba(145,158,171,0.20)] last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className={`${cell} font-semibold font-public-sans text-light-primary-text`}>
                    {variant === 'brand' ? (
                      <span className="inline-flex items-center gap-3">
                        <span className="size-8 shrink-0 rounded-lg overflow-hidden bg-[#F2F4F7] flex items-center justify-center">
                          {it.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.logo_url} alt={it.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-xs text-gray-500">{it.name.charAt(0).toUpperCase()}</span>
                          )}
                        </span>
                        {it.name}
                      </span>
                    ) : it.name}
                  </td>
                  <td className={`${cell} text-sm font-public-sans text-light-secondary-text max-w-xs`}>
                    {variant === 'attribute'
                      ? (it.values?.length ? it.values.map((v) => v.value).join(', ') : <span className="text-light-disabled-text">—</span>)
                      : variant === 'brand'
                        ? (it.description || <span className="text-light-disabled-text">—</span>)
                        : <span className="font-dm-sans">{it.slug}</span>}
                  </td>
                  <td className={`${cell} text-sm font-dm-sans text-light-primary-text`}>{it.product_count}</td>
                  <td className={cell}>
                    <span className={`px-2 py-1 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-medium ${it.is_active ? 'bg-success/16 text-success-dark' : 'bg-gray-200 text-gray-600'}`}>
                      {it.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className={cell}>
                    {confirmDel === it.slug ? (
                      <span className="inline-flex items-center gap-1.5">
                        <form
                          action={async (fd) => {
                            setDeleteError(null);
                            const result = await deleteAction(fd);
                            if (result && 'error' in result && result.error) setDeleteError(result.error);
                            setConfirmDel(null);
                          }}
                          className="inline"
                        >
                          <input type="hidden" name="slug" value={it.slug} />
                          <button type="submit" className="px-2.5 py-1 rounded-full text-xs font-semibold font-public-sans bg-error text-white hover:bg-error-dark">Delete</button>
                        </form>
                        <button onClick={() => setConfirmDel(null)} className="px-2.5 py-1 rounded-full text-xs font-medium font-public-sans text-gray-600 hover:bg-gray-100">Keep</button>
                      </span>
                    ) : (
                      <span data-manage className="inline-flex items-center gap-1">
                        {formHrefBase ? (
                          <Link href={`${formHrefBase}/${it.slug}/edit`} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100" title="Edit">
                            <Pencil size={15} />
                          </Link>
                        ) : (
                          <button onClick={() => { setEditing(it.slug); setCreating(false); }} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100" title="Edit">
                            <Pencil size={15} />
                          </button>
                        )}
                        <button onClick={() => setConfirmDel(it.slug)} className="w-8 h-8 flex items-center justify-center rounded-full text-error hover:bg-error/10" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-14 text-sm font-public-sans text-light-secondary-text">
                  No {singular.toLowerCase()}s yet — click “New {singular}” to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
      {deleteError && (
        <p className="mx-4 mb-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans sm:mx-6">
          {deleteError}
        </p>
      )}
    </div>
  );
}
