'use client';

import { useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { StockItem } from '@/lib/admin-types';
import { FloatingInput, FloatingSelect, PillButton } from '@/components/sellzy/product-ui';

/* The two things a stock line needs besides a number: the rules it is judged
   by, and a purchase order when the shelf will not fill itself.

   Both were already here and both work; they moved out of the old
   InventoryActions table so the grid could replace it. The third dialog that
   used to live there — a global "Stock adjustment" with a two-hundred-option
   product select — is gone: every row can now receive stock where it stands. */

export type RestockOption = { id: number; name: string; is_default?: boolean };

/** Ordering exactly the shortfall puts a product straight back on the low list,
 *  so the suggestion tops it up to twice its reorder level. Stated on the
 *  dialog, and every number stays editable. */
export function suggestedQuantity(item: { quantity_on_hand: number; reorder_level: number }) {
  return Math.max(item.reorder_level * 2 - item.quantity_on_hand, 1);
}

function Shell({
  title, onClose, pending, children, wide,
}: {
  title: string;
  onClose: () => void;
  pending: boolean;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => !pending && onClose()}
    >
      {/* overflowY is set inline on purpose. `.ak-card` carries `overflow:
          hidden` for its rounded corners, and being a later rule of equal
          specificity it beats Tailwind's `overflow-auto` — so a dialog taller
          than the viewport clipped its own footer instead of scrolling, and
          the submit button could not be reached at all on a short screen. An
          inline style is the one declaration the class cannot outrank. */}
      <div
        className={`ak-card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] p-4 sm:p-6`}
        style={{ overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{title}</h2>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close" className="ak-icon-btn" style={{ color: 'var(--text-3)' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StockRulesDialog({
  item, warehouses, action, onClose,
}: {
  item: StockItem;
  warehouses: RestockOption[];
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const backorderId = useId();
  const router = useRouter();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Shell title="Stock rules" onClose={onClose} pending={pending}>
      <p className="mb-4 text-sm" style={{ color: 'var(--text-2)' }}>{item.product.name}</p>
      <form action={submit} className="space-y-4">
        <input type="hidden" name="stock_id" value={item.id} />
        {/* Where this stock sits. The grid has always shown the column; until
            now nothing could fill it, so every row read blank. Unset stays a
            real option — a single-location shop should not be made to pick. */}
        <FloatingSelect
          label="Warehouse"
          name="warehouse"
          defaultValue={item.warehouse ?? ''}
          options={[
            { value: '', label: warehouses.length ? 'No warehouse' : 'No warehouses added yet' },
            ...warehouses.map((w) => ({ value: w.id, label: w.name })),
          ]}
        />
        <FloatingInput label="Reorder level" name="reorder_level" type="number" min="0" defaultValue={item.reorder_level} />
        <label htmlFor={backorderId} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-1)' }}>
          <input
            id={backorderId}
            type="checkbox"
            name="allow_backorder"
            defaultChecked={item.allow_backorder}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            Allow backorders
            <span className="block text-xs" style={{ color: 'var(--text-3)' }}>
              Shoppers can keep buying this once it hits zero, and the count is allowed to go negative.
            </span>
          </span>
        </label>
        {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <PillButton type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</PillButton>
          <PillButton type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save rules'}</PillButton>
        </div>
      </form>
    </Shell>
  );
}

/** One dialog for however many lines were picked: supplier, destination and
 *  priority are asked once, and each line arrives with a quantity in it.
 *  Raising twelve requests should not mean opening twelve forms.
 *
 *  Called "restock" rather than "order from supplier" because that is the job
 *  as the merchant thinks of it. The mechanism is unchanged: this raises
 *  requests, and the stock moves in Manage Inventory when they are received.
 *  Naming it for the errand must not make it look like the shelf just filled
 *  itself. */
export function RestockDialog({
  items, suppliers, warehouses, action, onClose,
}: {
  items: StockItem[];
  suppliers: RestockOption[];
  warehouses: RestockOption[];
  action: (formData: FormData) => Promise<{ error?: string; created?: number } | void>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(items.map((i) => [i.product.id, suggestedQuantity(i)])),
  );

  const defaultWarehouse = warehouses.find((w) => w.is_default)?.id ?? '';

  function submit(formData: FormData) {
    setError(null);
    formData.set(
      'lines',
      JSON.stringify(items.map((i) => ({ product_id: i.product.id, quantity: quantities[i.product.id] ?? 0 }))),
    );
    startTransition(async () => {
      const result = await action(formData);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        if (result.created) router.refresh();
        return;
      }
      setCreated(result?.created ?? items.length);
      router.refresh();
    });
  }

  return (
    <Shell
      title={created === null ? `Restock ${items.length} product${items.length === 1 ? '' : 's'}` : 'Requests raised'}
      onClose={onClose}
      pending={pending}
      wide
    >
      {created !== null ? (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            {created} request{created === 1 ? '' : 's'} raised. Stock changes in Manage Inventory, when the
            goods arrive and you mark the request received.
          </p>
          <div className="flex justify-end gap-3">
            <PillButton type="button" variant="secondary" onClick={onClose}>Close</PillButton>
            <Link href="/inventory" className="ak-btn-primary" style={{ borderRadius: 9999 }}>View requests</Link>
          </div>
        </div>
      ) : (
        <form action={submit} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            This raises a restock request. It does not change stock yet — that happens in Manage
            Inventory, when the goods arrive and you mark the request received. Quantities are
            suggested to bring each product to twice its reorder level.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FloatingSelect
              label="Supplier"
              name="supplier"
              defaultValue=""
              options={[
                { value: '', label: suppliers.length ? 'No supplier' : 'No suppliers added yet' },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <FloatingSelect
              label="Deliver to"
              name="warehouse"
              defaultValue={defaultWarehouse}
              options={[
                { value: '', label: warehouses.length ? 'No warehouse' : 'No warehouses added yet' },
                ...warehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
            <FloatingSelect
              label="Order type"
              name="order_type"
              defaultValue="restock"
              options={[
                { value: 'restock', label: 'Restock' },
                { value: 'new_stock', label: 'New stock' },
                { value: 'replacement', label: 'Replacement' },
              ]}
            />
            <FloatingSelect
              label="Priority"
              name="priority"
              defaultValue="normal"
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
          </div>

          <div className="divide-y rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{item.product.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {item.quantity_on_hand} {item.unit || 'pcs'} on hand · reorder at {item.reorder_level}
                  </p>
                </div>
                <label className="sr-only" htmlFor={`qty-${item.id}`}>Quantity to order for {item.product.name}</label>
                <input
                  id={`qty-${item.id}`}
                  type="number"
                  min={1}
                  value={quantities[item.product.id] ?? 1}
                  onChange={(e) =>
                    setQuantities((q) => ({ ...q, [item.product.id]: Math.max(1, Number(e.target.value) || 1) }))
                  }
                  className="ak-input w-24 text-center font-dm-sans tabular-nums"
                  style={{ height: 36, borderRadius: 10 }}
                />
              </div>
            ))}
          </div>

          <FloatingInput label="Note (optional)" name="note" />
          {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <PillButton type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</PillButton>
            <PillButton type="submit" disabled={pending}>
              {pending ? 'Raising…' : `Raise ${items.length} request${items.length === 1 ? '' : 's'}`}
            </PillButton>
          </div>
        </form>
      )}
    </Shell>
  );
}
