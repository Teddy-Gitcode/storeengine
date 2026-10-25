'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Image as ImageIcon, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { AdminProductVariant } from '@/lib/admin-types';
import { FloatingInput, FloatingSelect, StatusPill } from '@/components/sellzy/product-ui';

type Action = (formData: FormData) => void | Promise<void>;

/* The template's variant table chrome — a bordered block, not the page-wide table. */
const HEAD_ROW = 'bg-gray-50 hover:bg-gray-50 border-b border-gray-200';
const TH = 'h-12 p-3 first:pl-5 last:pr-5 whitespace-nowrap text-left align-middle text-light-primary-text text-sm font-semibold font-public-sans';
const ROW = 'border-b border-gray-100 last:border-0 transition-colors';
const TD = 'px-3 py-3.5 first:pl-5 last:pr-5 align-middle text-sm text-light-secondary-text font-public-sans';

const COLUMNS = ['SKU ID', 'Variant ID', 'Image', 'Color', 'Size', 'Leads card', 'Visible', 'Status', 'Action'];

/** A variant the user has typed but not yet saved (add-product page). */
export type VariantDraft = {
  sku: string;
  variant_code: string;
  color: string;
  size: string;
  price: string;
  stock_quantity: string;
  is_visible: boolean;
  status: string;
};

const EMPTY_DRAFT: VariantDraft = {
  sku: '',
  variant_code: '',
  color: '',
  size: '',
  price: '',
  stock_quantity: '0',
  is_visible: true,
  status: 'active',
};

function AddButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full inline-flex items-center justify-center gap-1.5 cursor-pointer font-bold transition-colors border border-primary bg-primary-lighter/20 text-primary hover:bg-primary-lighter/40 px-4 py-1 h-7.5 text-[13px] leading-5.5 font-public-sans"
    >
      {open ? <X size={13} /> : <Plus size={13} />}
      {open ? 'Close' : 'Add More Variant'}
    </button>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full inline-flex items-center justify-center gap-1.5 cursor-pointer font-bold transition-colors bg-primary text-white hover:bg-primary-dark disabled:opacity-50 px-4 py-1 h-7.5 text-[13px] leading-5.5 font-public-sans"
    >
      {pending ? 'Saving…' : children}
    </button>
  );
}

/* Field grid shared by the add form and the inline edit row. */
function VariantFields({ variant }: { variant?: AdminProductVariant }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FloatingInput label="Color" name="color" defaultValue={variant?.color ?? ''} />
      <FloatingInput label="Size" name="size" defaultValue={variant?.size ?? ''} />
      <FloatingInput label="Variant ID" name="variant_code" defaultValue={variant?.variant_code ?? ''} />
      <FloatingInput label="SKU" name="sku" defaultValue={variant?.sku ?? ''} />
      <FloatingInput label="Price override" name="price" type="number" step="0.01" min="0" defaultValue={variant?.price ?? ''} />
      <FloatingInput label="Stock" name="stock_quantity" type="number" min="0" defaultValue={variant?.stock_quantity ?? 0} />
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <ImageIcon size={26} className="text-gray-400" />
      <p className="text-sm font-semibold text-light-primary-text font-public-sans">No variants yet</p>
      <p className="text-xs text-light-secondary-text font-public-sans">{children}</p>
    </div>
  );
}

function Card({ action, children }: { action: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-500/20 bg-surface p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 font-public-sans">Variant</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Editor: variants that exist, driven by server actions ─────────────────── */

export function VariantTable({
  productId,
  slug,
  variants,
  createAction,
  updateAction,
  deleteAction,
}: {
  productId: number;
  slug: string;
  variants: AdminProductVariant[];
  createAction: Action;
  updateAction: Action;
  deleteAction: Action;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);

  return (
    <Card action={<AddButton open={adding} onClick={() => setAdding((v) => !v)} />}>
      {adding && (
        <form action={createAction} encType="multipart/form-data" className="mb-6 space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="product_id" value={productId} />
          <VariantFields />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-light-secondary-text font-public-sans">
              <span>Variant image</span>
              <input type="file" name="image" accept="image/*" className="text-xs" />
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-light-secondary-text font-public-sans">
                <input type="checkbox" name="is_visible" value="true" defaultChecked className="accent-primary" />
                Visible
              </label>
              <SubmitButton><Plus size={13} />Add variant</SubmitButton>
            </div>
          </div>
          <p className="text-xs text-light-secondary-text font-public-sans">
            Give the variant a colour, a size, or a variant ID so it can be told apart. Leave the price
            empty to inherit the product price.
          </p>
        </form>
      )}

      {variants.length === 0 ? (
        <EmptyState>Add colours, sizes or pack options and each gets its own SKU, price and stock.</EmptyState>
      ) : (
        <div className="rounded-lg border border-gray-200">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className={HEAD_ROW}>
                  {COLUMNS.map((c) => (
                    <th key={c} className={`${TH} ${c === 'Action' ? 'text-right' : ''}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  editing === v.id ? (
                    /* Price, stock, SKU and status all round-trip through
                       updateAction; until now only visibility and delete did. */
                    <tr key={v.id} className={`${ROW} bg-gray-50`}>
                      <td colSpan={COLUMNS.length} className="px-5 py-4">
                        <form action={updateAction} className="space-y-4" onSubmit={() => setEditing(null)}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="id" value={v.id} />
                          <VariantFields variant={v} />
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <FloatingSelect
                              label="Status"
                              name="status"
                              className="w-full sm:w-48"
                              defaultValue={v.status}
                              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                            />
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="rounded-full px-4 py-1 h-7.5 text-[13px] font-bold text-light-secondary-text transition-colors hover:bg-gray-100 font-public-sans"
                              >
                                Cancel
                              </button>
                              <SubmitButton>Save variant</SubmitButton>
                            </div>
                          </div>
                          <p className="text-xs text-light-secondary-text font-public-sans">
                            Leave the price override empty to inherit the product price.
                          </p>
                        </form>
                      </td>
                    </tr>
                  ) : (
                  <tr key={v.id} className={ROW}>
                    <td className={TD}>{v.sku ? `#${v.sku}` : '—'}</td>
                    <td className={TD}>{v.variant_code ? `#${v.variant_code}` : '—'}</td>
                    <td className={TD}>
                      <div className="flex size-8 items-center justify-center rounded-lg bg-gray-100">
                        {v.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.image_url} alt={v.label} className="size-full rounded-lg object-cover" />
                        ) : (
                          <ImageIcon size={14} className="text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className={TD}>{v.color || '—'}</td>
                    <td className={TD}>{v.size || '—'}</td>
                    <td className={TD}>
                      {/* Which option the shop's product card prices. Sales
                          override it once there are any — this is the answer
                          for a range nobody has ordered yet. One at a time:
                          picking another clears this one. */}
                      <form action={updateAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="is_default" value={v.is_default ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className={`rounded-full px-2 py-1 text-xs font-medium font-public-sans transition-colors ${
                            v.is_default
                              ? 'bg-primary-alpha-16 text-primary-dark hover:bg-primary-lighter/40'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title={
                            v.is_default
                              ? 'The card leads with this option'
                              : 'Lead the product card with this option'
                          }
                        >
                          {v.is_default ? 'Leads' : 'Set'}
                        </button>
                      </form>
                    </td>
                    <td className={TD}>
                      {/* Toggling visibility is a one-field save, so it posts on click. */}
                      <form action={updateAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="is_visible" value={v.is_visible ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className={`rounded-full px-2 py-1 text-xs font-medium font-public-sans transition-colors ${
                            v.is_visible
                              ? 'bg-primary-alpha-16 text-primary-dark hover:bg-primary-lighter/40'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                          title={v.is_visible ? 'Hide from the storefront' : 'Show on the storefront'}
                        >
                          {v.is_visible ? 'Visible' : 'Hidden'}
                        </button>
                      </form>
                    </td>
                    <td className={TD}>
                      <StatusPill label={v.status_label} tone={v.status === 'active' ? 'primary' : 'neutral'} />
                    </td>
                    <td className={`${TD} text-right`}>
                      {confirmDel === v.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <form action={async (fd) => { await deleteAction(fd); setConfirmDel(null); }} className="inline">
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="id" value={v.id} />
                            <button type="submit" className="rounded-full bg-error px-2.5 py-1 text-xs font-semibold text-white hover:bg-error-dark font-public-sans">
                              Delete
                            </button>
                          </form>
                          <button type="button" onClick={() => setConfirmDel(null)} className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 font-public-sans">
                            Keep
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditing(v.id); setAdding(false); }}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-light-primary-text transition-colors hover:bg-gray-100 hover:text-primary"
                            title="Edit variant"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDel(v.id)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-light-primary-text transition-colors hover:bg-gray-100 hover:text-error"
                            title="Delete variant"
                          >
                            <Trash2 size={16} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─── Add page: drafts collected client-side, saved with the product ────────── */

export function VariantDraftEditor({ name }: { name: string }) {
  const [drafts, setDrafts] = useState<VariantDraft[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<VariantDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (!draft.color && !draft.size && !draft.variant_code) {
      setError('Give the variant a colour, a size, or a variant ID so it can be told apart.');
      return;
    }
    setError(null);
    setDrafts((list) => [...list, draft]);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  }

  function set<K extends keyof VariantDraft>(key: K, value: VariantDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <Card action={<AddButton open={adding} onClick={() => { setAdding((v) => !v); setError(null); }} />}>
      {/* The drafts ride along with the product form and are created after it. */}
      <input type="hidden" name={name} value={JSON.stringify(drafts)} />

      {adding && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FloatingInput label="Color" name="draft_color" value={draft.color} onChange={(v) => set('color', v)} />
            <FloatingInput label="Size" name="draft_size" value={draft.size} onChange={(v) => set('size', v)} />
            <FloatingInput label="Variant ID" name="draft_variant_code" value={draft.variant_code} onChange={(v) => set('variant_code', v)} />
            <FloatingInput label="SKU" name="draft_sku" value={draft.sku} onChange={(v) => set('sku', v)} />
            <FloatingInput label="Price override" name="draft_price" type="number" step="0.01" min="0" value={draft.price} onChange={(v) => set('price', v)} />
            <FloatingInput label="Stock" name="draft_stock" type="number" min="0" value={draft.stock_quantity} onChange={(v) => set('stock_quantity', v)} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FloatingSelect
              label="Status"
              name="draft_status"
              className="w-full sm:w-48"
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
            />
            <button
              type="button"
              onClick={add}
              className="rounded-full inline-flex items-center justify-center gap-1.5 cursor-pointer font-bold transition-colors bg-primary text-white hover:bg-primary-dark px-4 py-1 h-7.5 text-[13px] leading-5.5 font-public-sans"
            >
              <Plus size={13} />Add to list
            </button>
          </div>
          {error && <p className="text-xs text-error font-public-sans">{error}</p>}
          <p className="text-xs text-light-secondary-text font-public-sans">
            Variant images are added on the product page once it exists.
          </p>
        </div>
      )}

      {drafts.length === 0 ? (
        <EmptyState>Add colours, sizes or pack options now, or add them after the product is created.</EmptyState>
      ) : (
        <div className="rounded-lg border border-gray-200">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className={HEAD_ROW}>
                  {['SKU ID', 'Variant ID', 'Color', 'Size', 'Price', 'Stock', 'Status', 'Action'].map((c) => (
                    <th key={c} className={`${TH} ${c === 'Action' ? 'text-right' : ''}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, i) => (
                  <tr key={i} className={ROW}>
                    <td className={TD}>{d.sku ? `#${d.sku}` : '—'}</td>
                    <td className={TD}>{d.variant_code ? `#${d.variant_code}` : '—'}</td>
                    <td className={TD}>{d.color || '—'}</td>
                    <td className={TD}>{d.size || '—'}</td>
                    <td className={TD}>{d.price || 'Same as product'}</td>
                    <td className={TD}>{d.stock_quantity || '0'}</td>
                    <td className={TD}>
                      <StatusPill label={d.status === 'active' ? 'Active' : 'Inactive'} tone={d.status === 'active' ? 'primary' : 'neutral'} />
                    </td>
                    <td className={`${TD} text-right`}>
                      <button
                        type="button"
                        onClick={() => setDrafts((list) => list.filter((_, j) => j !== i))}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-light-primary-text transition-colors hover:bg-gray-100 hover:text-error"
                        title="Remove variant"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
