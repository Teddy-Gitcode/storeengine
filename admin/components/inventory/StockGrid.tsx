'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, Download, Package, Pencil, RefreshCw, Settings2, ShoppingCart, Undo2, X,
} from 'lucide-react';
import type { StockItem } from '@/lib/admin-types';
import { FilterPill, PillButton, SearchBox, StatusPill } from '@/components/sellzy/product-ui';
import { useAccess } from '@/components/AccessContext';
import AddStock, { type ReceiveResult } from './AddStock';
import { RestockDialog, StockRulesDialog, type RestockOption } from './StockDialogs';

/* Every stock line, in one scrolling table, urgent first.
 *
 * What was here: eight rows a page over eighty-seven products, each row 65px
 * tall under 447px of tiles and toolbars — so exactly one line was visible
 * without scrolling, and the other seventy-nine sat on ten more pages. The
 * count is small enough to render at once, so it is rendered at once, grouped
 * by how much trouble each line is in.
 */

type Level = 'out' | 'low' | 'ok';

function levelOf(item: { quantity_on_hand: number; reorder_level: number }): Level {
  if (item.quantity_on_hand <= 0) return 'out';
  if (item.quantity_on_hand <= item.reorder_level) return 'low';
  return 'ok';
}

const LEVEL_COLOUR: Record<Level, string> = {
  out: 'var(--badge-error-ink)',
  low: 'var(--badge-warning-ink)',
  ok: 'var(--text-1)',
};

export type Toast = { label: string; quantity: number; movementId?: number; error?: string };

export default function StockGrid({
  items,
  suppliers,
  warehouses,
  categories,
  hiddenCount = 0,
  includeRetired = false,
  receiveAction,
  undoAction,
  stockRulesAction,
  restockAction,
}: {
  items: StockItem[];
  suppliers: RestockOption[];
  warehouses: RestockOption[];
  categories: string[];
  /** Archived and draft rows kept off this screen, named so the total the
   *  tiles report and the number of lines below it cannot silently disagree. */
  hiddenCount?: number;
  /** Whether retired listings are currently included, from the URL. */
  includeRetired?: boolean;
  receiveAction: (productId: number, quantity: number, variantId?: number) => Promise<ReceiveResult>;
  undoAction: (movementId: number) => Promise<{ error?: string }>;
  stockRulesAction: (formData: FormData) => Promise<{ error?: string } | void>;
  restockAction: (formData: FormData) => Promise<{ error?: string; created?: number } | void>;
}) {
  const router = useRouter();
  const { canManageHere } = useAccess();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // Collapsed, not expanded: a restocker opening this page wants to see the
  // whole shelf, and folds away the lines they are not working on.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [rulesFor, setRulesFor] = useState<StockItem | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [undoing, startUndo] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Which ranges were left open, per browser. A convenience, so it is allowed
  // to be missing: private windows and blocked site data both throw here.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stock-expanded');
      if (saved) setExpanded(new Set(JSON.parse(saved) as number[]));
    } catch {
      /* no stored preference, or storage unavailable */
    }
  }, []);

  const remember = useCallback((next: Set<number>) => {
    setExpanded(next);
    try {
      localStorage.setItem('stock-expanded', JSON.stringify([...next]));
    } catch {
      /* not worth telling anyone about */
    }
  }, []);

  const showToast = useCallback((outcome: Toast) => {
    setToast(outcome);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
    if (!outcome.error) router.refresh();
  }, [router]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category && item.product.category_name !== category) return false;
      if (level && levelOf(item) !== level) return false;
      if (!needle) return true;
      const haystack = [
        item.product.name, item.product.sku, item.product.category_name, item.product.brand_name,
        ...item.variants.map((v) => `${v.label} ${v.sku}`),
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [items, query, category, level]);

  /* Grouped by brand — the product line, which is what a restocker actually
     buys against. Not the category: Safari Pure tins are filed under Specialty
     Teas, so grouping by category would scatter one line across two headings.
     Urgency did not disappear; it moved into each heading, and the level
     filter still narrows to it.

     Lines with the most empty shelves sort first, because that is the order
     someone with a purchase order to write wants them in. */
  const grouped = useMemo(() => {
    const byBrand = new Map<string, StockItem[]>();
    for (const item of filtered) {
      const key = item.product.brand_name || 'Unbranded';
      const rows = byBrand.get(key);
      if (rows) rows.push(item);
      else byBrand.set(key, [item]);
    }
    return [...byBrand.entries()]
      .map(([label, rows]) => ({
        key: label,
        label,
        rows,
        out: rows.filter((i) => levelOf(i) === 'out').length,
        low: rows.filter((i) => levelOf(i) === 'low').length,
      }))
      .sort((a, b) => b.out - a.out || b.low - a.low || a.label.localeCompare(b.label));
  }, [filtered]);
  /* Short, and with nothing already on its way. Lines awaiting a delivery are
     left out: those are received against their request on /inventory, and
     adding stock here as well would count the same goods twice. */
  const needsRestock = useMemo(
    () => filtered.filter((i) => levelOf(i) !== 'ok' && !i.open_request),
    [filtered],
  );

  return (
    <div className="ak-card">
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="ak-page-title">Stock Products</h2>
            <p className="ak-page-sub">
              {filtered.length} lines · {filtered.filter((i) => levelOf(i) === 'out').length} out,{' '}
              {filtered.filter((i) => levelOf(i) === 'low').length} low
            </p>
            {hiddenCount > 0 && (
              <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                {includeRetired ? (
                  <>
                    Showing {hiddenCount} archived or draft product{hiddenCount === 1 ? '' : 's'} — stock added
                    to those cannot be sold.{' '}
                    <Link href="/products/stocks" className="underline" style={{ color: 'var(--brand)' }}>
                      Hide them
                    </Link>
                  </>
                ) : (
                  <>
                    {hiddenCount} archived or draft product{hiddenCount === 1 ? '' : 's'} not shown — stock added
                    to those cannot be sold.{' '}
                    <Link href="/products/stocks?retired=1" className="underline" style={{ color: 'var(--brand)' }}>
                      Show them
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
          {/* Wraps. At phone width this row used to run 22px past the edge and
              take the whole page with it. */}
          <div className="flex flex-wrap items-center gap-2">
            <PillButton variant="secondary" onClick={() => router.refresh()}>
              <RefreshCw size={14} />Refresh
            </PillButton>
            <PillButton variant="secondary" onClick={() => exportCsv(filtered)}>
              <Download size={14} />Export
            </PillButton>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox value={query} onChange={setQuery} placeholder="SKU, product, size…" />
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterPill
              value={category}
              onChange={setCategory}
              options={[{ value: '', label: 'Category' }, ...categories.map((c) => ({ value: c, label: c }))]}
            />
            <FilterPill
              value={level}
              onChange={setLevel}
              options={[
                { value: '', label: 'Any level' },
                { value: 'out', label: 'Out of stock' },
                { value: 'low', label: 'Low stock' },
                { value: 'ok', label: 'In stock' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* What the page is for, said once: these lines are short and nothing is
          on its way to them. Lines already on order are left out — they need
          patience, not another purchase request. */}
      {canManageHere && needsRestock.length > 0 && (
        <div
          className="mx-4 mb-4 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 sm:mx-5"
          style={{ border: '1px solid var(--brand-border)', background: 'var(--brand-light)' }}
        >
          <span className="text-sm" style={{ color: 'var(--text-1)' }}>
            {needsRestock.length} line{needsRestock.length === 1 ? '' : 's'} short with nothing on order.
          </span>
          <PillButton onClick={() => setRestockOpen(true)}>
            <ShoppingCart size={14} />Restock
          </PillButton>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="ak-empty flex flex-col items-center gap-2 py-16 text-center">
          <Package size={26} style={{ color: 'var(--text-3)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
            {items.length === 0 ? 'No stock records yet' : 'Nothing matches these filters'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {items.length === 0
              ? 'A product gets one the first time its stock moves.'
              : 'Try clearing the search or the filters.'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="ak-table w-full text-sm">
            <thead>
              <tr>
                {['Product', 'On hand', 'On order', 'Value', 'Add stock', ''].map((head, i) => (
                  <th key={head || i} className="whitespace-nowrap px-3 py-2.5 text-left text-[12px] font-semibold first:pl-5 last:pr-5">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map((group) =>
                group.rows.length === 0 ? null : (
                  <GroupRows
                    key={group.key}
                    group={group}
                    collapsed={collapsed.has(group.key)}
                    onToggleGroup={() => {
                      const next = new Set(collapsed);
                      if (next.has(group.key)) next.delete(group.key);
                      else next.add(group.key);
                      setCollapsed(next);
                    }}
                    expanded={expanded}
                    onToggle={(id) => {
                      const next = new Set(expanded);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      remember(next);
                    }}
                    receiveAction={receiveAction}
                    onDone={showToast}
                    canManage={canManageHere}
                    onRules={setRulesFor}
                  />
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {rulesFor && (
        <StockRulesDialog item={rulesFor} warehouses={warehouses} action={stockRulesAction} onClose={() => setRulesFor(null)} />
      )}
      {restockOpen && needsRestock.length > 0 && (
        <RestockDialog
          items={needsRestock}
          suppliers={suppliers}
          warehouses={warehouses}
          action={restockAction}
          onClose={() => setRestockOpen(false)}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg"
          style={{
            background: toast.error ? 'var(--error-light)' : 'var(--surface)',
            border: `1px solid ${toast.error ? 'var(--error-border)' : 'var(--border)'}`,
          }}
        >
          <span className="text-[13px]" style={{ color: toast.error ? 'var(--badge-error-ink)' : 'var(--text-1)' }}>
            {toast.error ? toast.error : `Added ${toast.quantity} × ${toast.label}`}
          </span>
          {!toast.error && toast.movementId && (
            <button
              type="button"
              disabled={undoing}
              onClick={() => {
                const movementId = toast.movementId!;
                startUndo(async () => {
                  await undoAction(movementId);
                  setToast(null);
                  router.refresh();
                });
              }}
              className="inline-flex items-center gap-1 text-[12px] font-semibold"
              style={{ color: 'var(--brand)' }}
            >
              <Undo2 size={12} />{undoing ? 'Undoing…' : 'Undo'}
            </button>
          )}
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" style={{ color: 'var(--text-3)' }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function GroupRows({
  group, collapsed, onToggleGroup, expanded, onToggle, receiveAction, onDone, canManage, onRules,
}: {
  group: { key: string; label: string; rows: StockItem[]; out: number; low: number };
  collapsed: boolean;
  onToggleGroup: () => void;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  receiveAction: (productId: number, quantity: number, variantId?: number) => Promise<ReceiveResult>;
  onDone: (outcome: Toast) => void;
  canManage: boolean;
  onRules: (item: StockItem) => void;
}) {
  return (
    <>
      <tr>
        <th
          colSpan={6}
          className="sticky top-0 z-10 p-0 text-left"
          style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={onToggleGroup}
            aria-expanded={!collapsed}
            className="flex w-full items-center gap-2 px-5 py-2 text-left"
          >
            <ChevronRight
              size={14}
              style={{
                color: 'var(--text-3)',
                transform: collapsed ? 'none' : 'rotate(90deg)',
                transition: 'transform 120ms',
              }}
            />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{group.label}</span>
            <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-3)' }}>
              {group.rows.length} product{group.rows.length === 1 ? '' : 's'}
            </span>
            {/* Only the counts worth acting on. A line with nothing short says
                nothing, rather than wearing an "all good" badge on every row. */}
            {group.out > 0 && <StatusPill label={`${group.out} out`} tone="error" />}
            {group.low > 0 && <StatusPill label={`${group.low} low`} tone="warning" />}
          </button>
        </th>
      </tr>
      {!collapsed && group.rows.map((item) => {
        const open = expanded.has(item.id);
        const hasVariants = item.variants.length > 0;
        const colour = LEVEL_COLOUR[levelOf(item)];
        return (
          <Row
            key={item.id}
            item={item}
            open={open}
            hasVariants={hasVariants}
            colour={colour}
            onToggle={onToggle}
            receiveAction={receiveAction}
            onDone={onDone}
            canManage={canManage}
            onRules={onRules}
          />
        );
      })}
    </>
  );
}

function Row({
  item, open, hasVariants, colour, onToggle, receiveAction, onDone, canManage, onRules,
}: {
  item: StockItem;
  open: boolean;
  hasVariants: boolean;
  colour: string;
  onToggle: (id: number) => void;
  receiveAction: (productId: number, quantity: number, variantId?: number) => Promise<ReceiveResult>;
  onDone: (outcome: Toast) => void;
  canManage: boolean;
  onRules: (item: StockItem) => void;
}) {
  const unit = item.unit || 'pcs';
  // How full the shelf is against twice its reorder level — the point the
  // restock suggestion tops it up to, so a full bar means "no action".
  const fill = Math.min(item.quantity_on_hand / Math.max(item.reorder_level * 2, 1), 1);

  return (
    <>
      <tr style={{ height: 44 }}>
        <td className="px-3 py-1.5 pl-5">
          <span className="flex items-center gap-1.5">
            {hasVariants ? (
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                aria-expanded={open}
                aria-label={`${open ? 'Hide' : 'Show'} the sizes of ${item.product.name}`}
                className="grid h-5 w-5 shrink-0 place-items-center rounded transition-transform"
                style={{ color: 'var(--text-3)', transform: open ? 'rotate(90deg)' : undefined }}
              >
                <ChevronRight size={14} />
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                {item.product.name}
              </span>
              <span className="block truncate text-[11px]" style={{ color: 'var(--text-3)' }}>
                {[item.product.sku, item.product.category_name, item.warehouse_name].filter(Boolean).join(' · ')}
              </span>
            </span>
          </span>
        </td>
        <td className="whitespace-nowrap px-3 py-1.5">
          <span className="font-dm-sans text-[14px] font-semibold tabular-nums" style={{ color: colour }}>
            {item.quantity_on_hand}
            <span className="ml-1 text-[11px] font-normal" style={{ color: 'var(--text-3)' }}>{unit}</span>
          </span>
          <span className="mt-1 block h-1 w-16 overflow-hidden rounded" style={{ background: 'var(--surface-3, var(--surface-2))' }}>
            <span className="block h-full rounded" style={{ width: `${fill * 100}%`, background: colour }} />
          </span>
        </td>
        <td className="whitespace-nowrap px-3 py-1.5 text-[12px]">
          {item.open_request ? (
            <Link href="/inventory" title={`Request ${item.open_request.reference}`} style={{ color: 'var(--brand)' }}>
              +{item.open_request.quantity}
            </Link>
          ) : (
            <span style={{ color: 'var(--text-3)' }}>—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-1.5 font-dm-sans text-[12px] tabular-nums" style={{ color: 'var(--text-2)' }}>
          {(item.quantity_on_hand * Number(item.product.price)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </td>
        <td className="whitespace-nowrap px-3 py-1.5">
          {hasVariants ? (
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }} title="Add stock to a size below">
              per size
            </span>
          ) : (
            <AddStock
              productId={item.product.id}
              label={item.product.name}
              unit={unit}
              receiveAction={receiveAction}
              onDone={onDone}
            />
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-1.5 pr-5">
          <span className="flex items-center gap-1">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => onRules(item)}
                  title="Stock rules"
                  aria-label={`Stock rules for ${item.product.name}`}
                  className="ak-icon-btn"
                  style={{ color: 'var(--text-3)' }}
                >
                  <Settings2 size={14} />
                </button>
                <RowMenuLink
                  href={`/products/stocks/order-request?product=${item.product.id}&qty=${Math.max(item.reorder_level * 2 - item.quantity_on_hand, 1)}`}
                  title="Order this from a supplier"
                >
                  <ShoppingCart size={14} />
                </RowMenuLink>
              </>
            )}
            <RowMenuLink href={`/products/edit/${item.product.slug}`} title="Edit product">
              <Pencil size={14} />
            </RowMenuLink>
          </span>
        </td>
      </tr>

      {open && item.variants.map((variant) => {
        // Until a variant carries its own reorder level, the product's is
        // shared out between the sizes — a rough threshold, but a better one
        // than treating every size as if the whole product's level applied.
        const share = Math.max(Math.round(item.reorder_level / Math.max(item.variants.length, 1)), 1);
        const variantLevel = levelOf({ quantity_on_hand: variant.stock_quantity, reorder_level: share });
        return (
          <tr key={variant.id} style={{ height: 40, background: 'var(--surface-2)' }}>
            <td className="px-3 py-1 pl-5">
              <span className="flex items-center gap-1.5 pl-6">
                <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>{variant.label}</span>
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{variant.sku}</span>
              </span>
            </td>
            <td className="whitespace-nowrap px-3 py-1">
              <span className="font-dm-sans text-[13px] tabular-nums" style={{ color: LEVEL_COLOUR[variantLevel] }}>
                {variant.stock_quantity}
              </span>
            </td>
            <td colSpan={2} />
            <td className="whitespace-nowrap px-3 py-1">
              <AddStock
                productId={item.product.id}
                variantId={variant.id}
                label={`${item.product.name} ${variant.label}`}
                unit={item.unit || 'pcs'}
                receiveAction={receiveAction}
                onDone={onDone}
              />
            </td>
            <td />
          </tr>
        );
      })}
    </>
  );
}

function RowMenuLink({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Link href={href} title={title} aria-label={title} className="ak-icon-btn" style={{ color: 'var(--text-3)' }}>
      {children}
    </Link>
  );
}

function exportCsv(items: StockItem[]) {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const rows = [
    ['SKU', 'Product', 'Category', 'On hand', 'Reorder at', 'On order', 'Unit price', 'Stock value', 'Warehouse', 'Level'],
    ...items.map((i) => [
      i.product.sku, i.product.name, i.product.category_name,
      i.quantity_on_hand, i.reorder_level, i.open_request?.quantity ?? 0,
      i.product.price, (i.quantity_on_hand * Number(i.product.price)).toFixed(2),
      i.warehouse_name || '', levelOf(i),
    ]),
  ];
  const blob = new Blob(['﻿', rows.map((r) => r.map(escape).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'stock.csv';
  link.click();
  URL.revokeObjectURL(url);
}
