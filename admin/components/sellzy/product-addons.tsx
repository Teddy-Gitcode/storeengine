'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus, Sparkles, Trash2, X } from 'lucide-react';
import type { AdminAddonGroup } from '@/lib/admin-types';
import { FloatingInput, FloatingSelect, StatusPill } from '@/components/sellzy/product-ui';

type Action = (formData: FormData) => void | Promise<void>;

/* Add-ons: extras a shopper can pick with this product — honey sachets, gift
   wrap, a mug — each adding its own price to every unit. Grouped, so a group
   can be "pick one" or "pick any", and optional or required. The app shows
   them on the product page; checkout prices them on the server. */

const PILL =
  'rounded-full inline-flex items-center justify-center gap-1.5 cursor-pointer font-bold transition-colors px-4 py-1 h-7.5 text-[13px] leading-5.5 font-public-sans';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${PILL} bg-primary text-white hover:bg-primary-dark disabled:opacity-50`}
    >
      {pending ? 'Saving…' : children}
    </button>
  );
}

function Toggle({
  action,
  slug,
  id,
  field,
  on,
  onLabel,
  offLabel,
  title,
}: {
  action: Action;
  slug: string;
  id: number;
  field: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
  title: string;
}) {
  return (
    <form action={action} className="inline" data-manage>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name={field} value={on ? 'false' : 'true'} />
      <button
        type="submit"
        title={title}
        className={`rounded-full px-2 py-1 text-xs font-medium font-public-sans transition-colors ${
          on ? 'bg-primary-alpha-16 text-primary-dark hover:bg-primary-lighter/40' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {on ? onLabel : offLabel}
      </button>
    </form>
  );
}

export function AddonsCard({
  productId,
  slug,
  groups,
  currency,
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  createAddonAction,
  updateAddonAction,
  deleteAddonAction,
}: {
  productId: number;
  slug: string;
  groups: AdminAddonGroup[];
  currency: string;
  createGroupAction: Action;
  updateGroupAction: Action;
  deleteGroupAction: Action;
  createAddonAction: Action;
  updateAddonAction: Action;
  deleteAddonAction: Action;
}) {
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-gray-500/20 bg-surface p-4 sm:p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 font-public-sans">Add-ons</h2>
        <button
          type="button"
          data-manage
          onClick={() => setAdding((v) => !v)}
          className={`${PILL} border border-primary bg-primary-lighter/20 text-primary hover:bg-primary-lighter/40`}
        >
          {adding ? <X size={13} /> : <Plus size={13} />}
          {adding ? 'Close' : 'Add a group'}
        </button>
      </div>
      <p className="mb-5 text-xs text-light-secondary-text font-public-sans">
        Extras shoppers can pick with this product in the app — each adds its price to every unit. A
        group is &ldquo;pick one&rdquo; or &ldquo;pick any&rdquo;; a required group must be chosen before checkout.
      </p>

      {adding && (
        <form
          action={async (fd) => { await createGroupAction(fd); setAdding(false); }}
          className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-center"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="sort_order" value={groups.length} />
          <FloatingInput label="Group name, e.g. Sweeten it" name="name" required />
          <FloatingSelect
            label="Shopper picks"
            name="selection"
            defaultValue="multiple"
            options={[{ value: 'multiple', label: 'Any of them' }, { value: 'single', label: 'One of them' }]}
          />
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-light-secondary-text font-public-sans">
              <input type="checkbox" name="required" value="true" className="accent-primary" />
              Required
            </label>
            <SubmitButton><Plus size={13} />Add group</SubmitButton>
          </div>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Sparkles size={26} className="text-gray-400" />
          <p className="text-sm font-semibold text-light-primary-text font-public-sans">No add-ons yet</p>
          <p className="text-xs text-light-secondary-text font-public-sans">
            Offer gift wrap, honey sachets or a mug alongside this product.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.id} className="rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-light-primary-text font-public-sans">{g.name}</span>
                  <StatusPill label={g.selection_label} tone="info" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Toggle
                    action={updateGroupAction}
                    slug={slug}
                    id={g.id}
                    field="required"
                    on={g.required}
                    onLabel="Required"
                    offLabel="Optional"
                    title={g.required ? 'Make it optional' : 'Make shoppers choose one'}
                  />
                  {confirmDel === `g${g.id}` ? (
                    <span className="inline-flex items-center gap-1.5" data-manage>
                      <form action={async (fd) => { await deleteGroupAction(fd); setConfirmDel(null); }} className="inline">
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="id" value={g.id} />
                        <button type="submit" className="rounded-full bg-error px-2.5 py-1 text-xs font-semibold text-white hover:bg-error-dark font-public-sans">
                          Delete group
                        </button>
                      </form>
                      <button type="button" onClick={() => setConfirmDel(null)} className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 font-public-sans">
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-manage
                      onClick={() => setConfirmDel(`g${g.id}`)}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-light-primary-text transition-colors hover:bg-gray-100 hover:text-error"
                      title="Delete group"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <ul className="divide-y divide-gray-100">
                {g.addons.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                    <span className={`text-sm font-public-sans ${a.is_active ? 'text-light-primary-text' : 'text-gray-400 line-through'}`}>
                      {a.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm tabular-nums text-light-secondary-text font-public-sans">
                        {Number(a.price) > 0 ? `+${currency} ${a.price}` : 'Free'}
                      </span>
                      <Toggle
                        action={updateAddonAction}
                        slug={slug}
                        id={a.id}
                        field="is_active"
                        on={a.is_active}
                        onLabel="On sale"
                        offLabel="Off"
                        title={a.is_active ? 'Stop offering it' : 'Offer it again'}
                      />
                      {confirmDel === `a${a.id}` ? (
                        <form
                          action={async (fd) => { await deleteAddonAction(fd); setConfirmDel(null); }}
                          className="inline"
                          data-manage
                        >
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="rounded-full bg-error px-2.5 py-1 text-xs font-semibold text-white hover:bg-error-dark font-public-sans">
                            Delete
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          data-manage
                          onClick={() => setConfirmDel(`a${a.id}`)}
                          className="inline-flex size-7 items-center justify-center rounded-lg text-light-primary-text transition-colors hover:bg-gray-100 hover:text-error"
                          title="Delete add-on"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
                <li className="px-4 py-3" data-manage>
                  <form action={createAddonAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-center">
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="group_id" value={g.id} />
                    <input type="hidden" name="sort_order" value={g.addons.length} />
                    <FloatingInput label="Add-on, e.g. Honey sachets" name="name" required />
                    <FloatingInput label={`Price (${currency})`} name="price" type="number" step="0.01" min="0" defaultValue="0" />
                    <SubmitButton><Plus size={13} />Add</SubmitButton>
                  </form>
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
