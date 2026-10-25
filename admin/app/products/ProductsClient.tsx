'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronRight, Download, Eye, ImageIcon, Package, Pencil, Trash2, X } from 'lucide-react';
import type { AdminProduct } from '@/lib/admin-types';
import {
  FilterPill, IconAction, Pagination, PillButton, SearchBox, StatusPill,
  TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH, type PillTone,
} from '@/components/sellzy/product-ui';
import { moneyFormatter } from '@/lib/money';
import ViewToggle, { useViewPreference } from '@/components/ui/ViewToggle';

/* The catalogue, as a grid by default.
 *
 * A product is a thing with a picture on it. The table showed that picture at
 * 32px in the corner of a row, which is smaller than the SKU beside it — so
 * the fastest way to find a product by eye was the slowest column to read.
 * The grid leads with the image and keeps every fact the table carried.
 *
 * The table is still here, one click away, because it is better for the jobs
 * the grid is worse at: comparing prices down a column, or scanning status
 * across eighty rows. The choice is remembered per browser; the default for
 * someone who has never chosen is the grid.
 */

const PAGE_SIZE = { grid: 24, table: 12 } as const;

function statusTone(status: string): { label: string; tone: PillTone } {
  if (status === 'active') return { label: 'Publish', tone: 'primary' };
  if (status === 'archived') return { label: 'Archived', tone: 'error' };
  return { label: 'Draft', tone: 'warning' };
}

/** What the tile says about stock in one short phrase, and how alarmed it looks.
 *  A product sold in sizes reports the total across them, because that is what
 *  its own stock record holds. */
function stockNote(product: AdminProduct): { text: string; tone: PillTone } {
  const stock = product.stock;
  if (!stock) return { text: 'Not tracked', tone: 'neutral' };
  const unit = stock.unit || 'pcs';
  if (stock.quantity_on_hand <= 0) return { text: 'Out of stock', tone: 'error' };
  if (stock.quantity_on_hand <= stock.reorder_level) {
    return { text: `${stock.quantity_on_hand} ${unit} left`, tone: 'warning' };
  }
  return { text: `${stock.quantity_on_hand} ${unit}`, tone: 'success' };
}

export default function ProductsClient({
  initialProducts,
  categories = [],
  initialStatus = '',
  heading,
  currencyCode = 'USD',
  locale = 'en-US',
  bulkStatusAction,
  bulkDeleteAction,
  setVariantPriceAction,
  setVariantStockAction,
}: {
  initialProducts: AdminProduct[];
  categories?: { id: number; name: string }[];
  initialStatus?: string;
  heading?: string;
  currencyCode?: string;
  locale?: string;
  bulkStatusAction?: (formData: FormData) => Promise<{ error?: string } | void>;
  bulkDeleteAction?: (formData: FormData) => Promise<{ error?: string } | void>;
  setVariantPriceAction?: (formData: FormData) => Promise<{ error?: string } | void>;
  setVariantStockAction?: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const money = useMemo(
    () => moneyFormatter({ currency_code: currencyCode, locale }, 2),
    [currencyCode, locale],
  );
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [view, setView] = useViewPreference('products', 'grid');
  /* Selection is by slug, because that is what the product endpoints take.
     It survives paging and filtering: picking twelve, narrowing to archived
     and pressing delete must act on the twelve, not on what is on screen. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [, startTransition] = useTransition();

  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());

  function toggleBrand(name: string) {
    setCollapsedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }
  function toggleExpanded(id: number) {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleProduct(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }
  function runBulk(action: (fd: FormData) => Promise<{ error?: string } | void>, extra: Record<string, string> = {}) {
    setBulkBusy(true);
    setBulkError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('ids', JSON.stringify([...selected]));
      for (const [k, v] of Object.entries(extra)) fd.set(k, v);
      const result = await action(fd);
      if (result && 'error' in result && result.error) setBulkError(result.error);
      else setSelected(new Set());
      setConfirmBulkDelete(false);
      setBulkBusy(false);
    });
  }

  const filtered = useMemo(
    () =>
      initialProducts.filter((product) => {
        if (query && !`${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase())) return false;
        if (category && product.category.name !== category) return false;
        if (status && product.status !== status) return false;
        return true;
      }),
    [initialProducts, query, category, status],
  );

  const pageSize = PAGE_SIZE[view];
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* Grouped by brand, then by product, then by pack size — the shape the
     catalogue actually has since the regrouping, and the one a merchant asks
     for by name ("the Fahari ginger, the 250g"). The table shows every
     filtered row rather than a page of twelve: a brand split across two pages
     is not a group, and eighty-six rows is a rendering problem, not a paging
     one — the stock screen settled this already. */
  const brandGroups = useMemo(() => {
    const byBrand = new Map<string, AdminProduct[]>();
    for (const product of filtered) {
      const key = product.brand?.name || 'Unbranded';
      const list = byBrand.get(key);
      if (list) list.push(product);
      else byBrand.set(key, [product]);
    }
    return [...byBrand.entries()]
      .map(([name, products]) => ({ name, products }))
      .sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name));
  }, [filtered]);

  /* Table renders everything filtered, grid still pages — so "select all"
     must mean what is in front of you in either view. */
  const visibleItems = view === 'table' ? filtered : pageItems;
  const pageSlugs = visibleItems.map((p) => p.slug);
  const allOnPageSelected = pageSlugs.length > 0 && pageSlugs.every((slug) => selected.has(slug));
  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageSlugs.forEach((s) => next.delete(s));
      else pageSlugs.forEach((s) => next.add(s));
      return next;
    });
  }
  const selectedProducts = filtered.filter((p) => selected.has(p.slug));

  return (
    <div className="ak-card">
      <div className="flex flex-col gap-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="ak-page-title">{heading ?? 'All Products'}</h2>
            <p className="ak-page-sub">{filtered.length} of {initialProducts.length} products</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle view={view} onChange={(next) => { setView(next); setPage(1); }} label="How products are shown" />
            <PillButton href="/products/add">Create Product</PillButton>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search by name or SKU…" />
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterPill
              value={category}
              onChange={(v) => { setCategory(v); setPage(1); }}
              options={[{ value: '', label: 'Category' }, ...categories.map((c) => ({ value: c.name, label: c.name }))]}
            />
            <FilterPill
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: '', label: 'Status' },
                { value: 'active', label: 'Publish' },
                { value: 'draft', label: 'Draft' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mx-4 mb-4 flex flex-wrap items-center gap-2.5 rounded-xl px-4 py-3 sm:mx-6"
             style={{ border: '1px solid var(--brand-border)', background: 'var(--brand-light)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{selected.size} selected</span>

          <button type="button" onClick={() => downloadProductsCsv(selectedProducts)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
            <Download size={14} />Export
          </button>

          {bulkStatusAction && (
            <select
              disabled={bulkBusy}
              defaultValue=""
              onChange={(e) => { const v = e.target.value; e.target.value = ''; if (v) runBulk(bulkStatusAction, { status: v }); }}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            >
              <option value="">Set status…</option>
              <option value="active">Publish</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          )}

          {bulkDeleteAction && (confirmBulkDelete ? (
            <span className="inline-flex items-center gap-1.5">
              <button type="button" disabled={bulkBusy} onClick={() => runBulk(bulkDeleteAction)}
                      className="rounded-full bg-error px-3 py-1.5 text-xs font-semibold text-white">
                {bulkBusy ? 'Deleting…' : `Yes, delete ${selected.size}`}
              </button>
              <button type="button" onClick={() => setConfirmBulkDelete(false)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ color: 'var(--text-2)' }}>Keep</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmBulkDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-error"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Trash2 size={14} />Delete
            </button>
          ))}

          <button type="button" onClick={() => { setSelected(new Set()); setConfirmBulkDelete(false); }}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-3)' }}>
            <X size={13} />Clear
          </button>
        </div>
      )}

      {bulkError && (
        <p className="mx-4 mb-2 rounded-xl px-4 py-3 text-sm sm:mx-6"
           style={{ background: 'var(--badge-error-bg)', color: 'var(--error)' }}>{bulkError}</p>
      )}

      {pageItems.length === 0 ? (
        <div className="ak-empty flex flex-col items-center gap-2 py-16 text-center">
          <Package size={26} style={{ color: 'var(--text-3)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>No products match this filter</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Try clearing the search or the filters.</p>
        </div>
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-2 gap-3 px-4 sm:gap-4 sm:px-6 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {pageItems.map((product) => (
            <li key={product.id} className="relative">
              <input type="checkbox"
                     className="absolute left-3 top-3 z-10 size-4 accent-primary"
                     checked={selected.has(product.slug)}
                     onChange={() => toggleProduct(product.slug)}
                     aria-label={`Select ${product.name}`} />
              <ProductTile product={product} money={money} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <th className={`${TABLE_TH} w-8`}>
                  <input type="checkbox" className="size-4 accent-primary"
                         checked={allOnPageSelected} onChange={togglePage}
                         aria-label={allOnPageSelected ? 'Clear this page' : 'Select this page'} />
                </th>
                {['ID', 'Product', 'Category', 'Price', 'Stock', 'Status', 'Action'].map((head) => (
                  <th key={head} className={TABLE_TH}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brandGroups.map((group) => (
                <Fragment key={group.name}>
                  <tr>
                    <th colSpan={8} className="sticky top-0 z-10 p-0 text-left"
                        style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                      <button type="button" onClick={() => toggleBrand(group.name)}
                              aria-expanded={!collapsedBrands.has(group.name)}
                              className="flex w-full items-center gap-2 px-5 py-2 text-left">
                        <ChevronRight size={14} style={{ color: 'var(--text-3)',
                          transform: collapsedBrands.has(group.name) ? 'none' : 'rotate(90deg)',
                          transition: 'transform 120ms' }} />
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{group.name}</span>
                        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-3)' }}>
                          {group.products.length} product{group.products.length === 1 ? '' : 's'}
                        </span>
                      </button>
                    </th>
                  </tr>
                  {!collapsedBrands.has(group.name) && group.products.map((product) => {
                const badge = statusTone(product.status);
                const stock = stockNote(product);
                const thumb = product.images?.[0]?.url;
                const sizes = product.variants ?? [];
                const open = expandedProducts.has(product.id);
                return (
                  <Fragment key={product.id}>
                  <tr className={TABLE_ROW}>
                    <td className={TABLE_TD}>
                      <input type="checkbox" className="size-4 accent-primary"
                             checked={selected.has(product.slug)}
                             onChange={() => toggleProduct(product.slug)}
                             aria-label={`Select ${product.name}`} />
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-sm`} style={{ color: 'var(--text-3)' }}>
                      #{product.legacy_id || product.id}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: 'var(--surface-2)' }}>
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="size-8 rounded-lg object-cover" />
                          ) : (
                            <ImageIcon size={14} style={{ color: 'var(--text-3)' }} />
                          )}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--text-2)' }}>{product.name}</span>
                        {sizes.length > 0 && (
                          <button type="button" onClick={() => toggleExpanded(product.id)}
                                  aria-expanded={open}
                                  title={open ? 'Hide pack sizes' : `Show ${sizes.length} pack sizes`}
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                  style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                            <ChevronRight size={11} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }} />
                            {sizes.length} size{sizes.length === 1 ? '' : 's'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`} style={{ color: 'var(--text-3)' }}>{product.category.name}</td>
                    <td className={`${TABLE_TD} whitespace-nowrap font-dm-sans text-sm font-semibold`} style={{ color: 'var(--brand)' }}>
                      {money(product.price)}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}><StatusPill label={stock.text} tone={stock.tone} /></td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}><StatusPill label={badge.label} tone={badge.tone} /></td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}>
                      <div className="flex items-center gap-1">
                        <IconAction href={`/products/${product.id}`} title="View product"><Eye size={16} /></IconAction>
                        <IconAction href={`/products/edit/${product.slug}`} title="Edit product"><Pencil size={16} /></IconAction>
                      </div>
                    </td>
                  </tr>
                  {open && sizes.map((variant) => (
                    /* A pack size, with the two numbers that differ from its
                       parent: what it costs and how many are on the shelf.
                       Everything else it inherits, so repeating it here would
                       only make the row harder to read. */
                    <tr key={variant.id} style={{ background: 'var(--surface-2)' }}>
                      <td className={TABLE_TD} />
                      <td className={`${TABLE_TD} whitespace-nowrap text-xs`} style={{ color: 'var(--text-3)' }}>
                        {variant.sku}
                      </td>
                      <td className={`${TABLE_TD} whitespace-nowrap`}>
                        <span className="flex items-center gap-2 pl-11 text-[13px]" style={{ color: 'var(--text-2)' }}>
                          {[variant.color, variant.size].filter(Boolean).join(' / ') || variant.variant_code || 'Option'}
                          {variant.is_default && (
                            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                  style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>default</span>
                          )}
                        </span>
                      </td>
                      <td className={TABLE_TD} />
                      <td className={`${TABLE_TD} whitespace-nowrap font-dm-sans text-sm`} style={{ color: 'var(--text-1)' }}>
                        <EditableCell
                          value={variant.price ?? variant.effective_price ?? product.price}
                          format={(raw) => money(raw)}
                          disabled={!setVariantPriceAction}
                          onSave={async (next) => {
                            const fd = new FormData();
                            fd.set('variant_id', String(variant.id));
                            fd.set('price', next);
                            return setVariantPriceAction!(fd);
                          }}
                        />
                      </td>
                      <td className={`${TABLE_TD} whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-1.5">
                          <EditableCell
                            value={variant.stock_quantity}
                            suffix=" pcs"
                            disabled={!setVariantStockAction}
                            onSave={async (next) => {
                              const fd = new FormData();
                              fd.set('variant_id', String(variant.id));
                              fd.set('product_id', String(product.id));
                              fd.set('quantity', next);
                              return setVariantStockAction!(fd);
                            }}
                          />
                          {variant.stock_quantity <= 0 && <StatusPill label="Out" tone="error" />}
                        </span>
                      </td>
                      <td className={`${TABLE_TD} whitespace-nowrap`}>
                        {!variant.is_visible && <StatusPill label="Hidden" tone="neutral" />}
                      </td>
                      <td className={TABLE_TD} />
                    </tr>
                  ))}
                  </Fragment>
                );
              })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t p-4 sm:p-6" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
          {view === 'table'
            ? `${filtered.length} product${filtered.length === 1 ? '' : 's'} in ${brandGroups.length} brand${brandGroups.length === 1 ? '' : 's'}`
            : `Showing ${pageItems.length} of ${filtered.length} products`}
        </span>
        {/* The grouped table has no pages to turn — it renders the whole
            filtered catalogue so a brand is never split across two of them. */}
        {view !== 'table' && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
      </div>
    </div>
  );
}

function ProductTile({ product, money }: { product: AdminProduct; money: (value: string | number) => string }) {
  const badge = statusTone(product.status);
  const stock = stockNote(product);
  const image = product.images?.[0]?.url;
  const wasPrice = product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
    ? product.compare_at_price
    : null;
  const options = product.variants?.filter((v) => v.is_visible).length ?? 0;

  return (
    <>
      {/* The whole tile is the link to editing it, which is what someone came to
          the catalogue to do. "View" stays as a separate control so the two are
          not guessed at from one target. */}
      <Link
        href={`/products/edit/${product.slug}`}
        className="ak-product-tile group h-full"
        style={{ padding: 10 }}
      >
        <div className="ak-product-thumb" style={{ marginBottom: 10 }}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ zIndex: 2 }} />
          ) : (
            <span>{(product.sku || product.name).slice(0, 3).toUpperCase()}</span>
          )}
          {/* Status sits on the image so a shelf of drafts reads at a glance,
              rather than needing the eye to travel to a column. */}
          <span className="absolute right-1.5 top-1.5 rounded-full shadow-sm" style={{ zIndex: 3, background: 'var(--surface)' }}>
            <StatusPill label={badge.label} tone={badge.tone} />
          </span>
          {options > 0 && (
            <span
              className="absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ zIndex: 3, background: 'color-mix(in srgb, var(--surface) 88%, transparent)', color: 'var(--text-2)' }}
            >
              {options} option{options === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <p
          className="line-clamp-2 text-[13px] font-medium leading-snug"
          style={{ color: 'var(--text-1)', minHeight: '2.4em' }}
          title={product.name}
        >
          {product.name}
        </p>
        <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-3)' }}>
          {product.sku || `#${product.legacy_id || product.id}`} · {product.category.name}
        </p>

        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="font-dm-sans text-[14px] font-bold tabular-nums" style={{ color: 'var(--brand)' }}>
            {money(product.price)}
          </span>
          {wasPrice && (
            <span className="font-dm-sans text-[11px] tabular-nums line-through" style={{ color: 'var(--text-3)' }}>
              {money(wasPrice)}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <StatusPill label={stock.text} tone={stock.tone} />
          {/* Not a nested anchor — a link inside a link is neither valid nor
              reachable by keyboard. It is an icon that the tile's own href
              already covers, kept for recognition. */}
          <span className="ak-icon-btn opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--text-3)' }} aria-hidden>
            <Pencil size={14} />
          </span>
        </div>
      </Link>
    </>
  );
}

/** The selected products as a spreadsheet. Fields a merchant reconciles
 *  against a pricelist — not the whole record, which nobody reads in a cell. */
function downloadProductsCsv(products: AdminProduct[]) {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const head = ['ID', 'SKU', 'Name', 'Category', 'Brand', 'Price', 'Status'];
  const lines = [head.join(',')];
  for (const p of products) {
    lines.push([
      p.legacy_id || p.id, p.sku, p.name,
      p.category?.name ?? '', p.brand?.name ?? '', p.price, p.status,
    ].map(escape).join(','));
  }
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products-selection.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/* A number you can correct where you read it.
 *
 * Reading is the common case, so the cell stays plain text until it is asked
 * for — a grid of input boxes reads as a form to fill in rather than a table
 * to scan. Enter commits, Escape abandons, and blur commits too, because
 * clicking away from a number you have just typed means you meant it.
 *
 * The saved value is not echoed back from here. The server action revalidates
 * the page, so what appears next is what the database holds — which is the
 * only way a price that was silently rejected shows up as unchanged instead of
 * looking saved. */
function EditableCell({
  value, format, onSave, suffix, align = 'left', disabled,
}: {
  value: string | number;
  format?: (raw: string | number) => string;
  onSave: (next: string) => Promise<{ error?: string } | void>;
  suffix?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabled) return <span>{format ? format(value) : String(value)}{suffix}</span>;

  async function commit() {
    if (busy) return;
    if (draft.trim() === String(value).trim()) { setEditing(false); setError(null); return; }
    setBusy(true);
    const result = await onSave(draft.trim());
    setBusy(false);
    if (result && 'error' in result && result.error) { setError(result.error); return; }
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setDraft(String(value)); setEditing(true); setError(null); }}
        title="Click to edit"
        className={`rounded px-1 py-0.5 text-inherit hover:bg-black/5 ${align === 'right' ? 'text-right' : ''}`}
      >
        {format ? format(value) : String(value)}{suffix}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <input
        autoFocus
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(); }
          if (e.key === 'Escape') { setEditing(false); setError(null); }
        }}
        className="ak-input w-24 text-center font-dm-sans tabular-nums"
        style={{ height: 30, borderRadius: 8 }}
      />
      {error && <span className="text-[10px]" style={{ color: 'var(--error)' }}>{error}</span>}
    </span>
  );
}
