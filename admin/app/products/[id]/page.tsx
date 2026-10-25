import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Image as ImageIcon, Pencil } from 'lucide-react';
import { getProduct, getProducts, getStoreSettings } from '@/lib/admin-api';
import type { AdminProduct } from '@/lib/admin-types';
import { storefrontUrl } from '@/lib/storefront';
import {
  StatusPill, TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH, type PillTone,
} from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

function statusTone(status: string): { label: string; tone: PillTone } {
  if (status === 'active') return { label: 'Published', tone: 'primary' };
  if (status === 'archived') return { label: 'Archived', tone: 'error' };
  return { label: 'Draft', tone: 'warning' };
}

/**
 * The template's read-only product view. Its URL carries the product id, but
 * our API is keyed by slug, so a numeric id is resolved through the list.
 */
async function resolveProduct(idOrSlug: string): Promise<AdminProduct | null> {
  if (!/^\d+$/.test(idOrSlug)) return getProduct(idOrSlug);
  const id = Number(idOrSlug);
  const page = await getProducts({ page_size: 200 });
  const match = page.results.find((p) => p.id === id);
  return match ? getProduct(match.slug) : null;
}

export default async function ProductViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, settings] = await Promise.all([
    resolveProduct(id),
    getStoreSettings().catch(() => null),
  ]);
  if (!product) notFound();

  const money = new Intl.NumberFormat(settings?.locale || 'en-US', {
    style: 'currency',
    currency: settings?.currency_code || 'USD',
  });
  const s = statusTone(product.status);
  const variants = product.variants ?? [];

  const facts = [
    { label: 'Product Name', value: product.name },
    { label: 'Category Name', value: product.category.name },
    { label: 'Brand', value: product.brand?.name || '—' },
    { label: 'SKU', value: product.sku || '—' },
    { label: 'Price', value: money.format(Number(product.price)) },
    {
      label: 'Previous Price',
      value: product.compare_at_price ? money.format(Number(product.compare_at_price)) : '—',
    },
    { label: 'Slug', value: product.slug },
    { label: 'Stock', value: product.stock ? `${product.stock.quantity_on_hand} in stock` : 'Not tracked' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Header ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="flex size-8 items-center justify-center rounded-full text-light-primary-text transition-colors hover:bg-gray-200"
            aria-label="Back to products"
          >
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans sm:text-xl">Product Details</h2>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={storefrontUrl(`/product/${product.slug}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7.5 items-center gap-1.5 rounded-full border border-gray-300 px-4 py-1 text-[13px] font-bold text-light-secondary-text transition-colors hover:bg-gray-50 font-public-sans"
          >
            <ExternalLink size={13} />View on storefront
          </a>
          <Link
            href={`/products/edit/${product.slug}`}
            className="inline-flex h-7.5 items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-[13px] font-bold text-white transition-colors hover:bg-primary-dark font-public-sans"
          >
            <Pencil size={13} />Edit
          </Link>
        </div>
      </div>

      {/* ─── Basic Information ──────────────────── */}
      <div className="rounded-2xl border border-gray-500/20 bg-surface">
        <div className="flex items-center justify-between gap-4 border-b border-gray-500/20 px-4 py-4 sm:px-6">
          <h3 className="text-lg font-bold text-light-primary-text font-public-sans">Basic Information</h3>
          <StatusPill label={s.label} tone={s.tone} />
        </div>
        <div className="p-4 sm:p-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-xs text-light-secondary-text font-public-sans">{f.label}</dt>
                <dd className="truncate text-sm font-bold text-light-primary-text font-public-sans" title={f.value}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <p className="text-xs text-light-secondary-text font-public-sans">Short Description</p>
            <p className="text-sm text-light-primary-text font-public-sans">
              {product.short_description || '—'}
            </p>
          </div>

          {product.description && (
            <div className="mt-4">
              <p className="text-xs text-light-secondary-text font-public-sans">Description</p>
              <p className="whitespace-pre-line text-sm text-light-primary-text font-public-sans">
                {product.description}
              </p>
            </div>
          )}

          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-xs text-light-secondary-text font-public-sans">Tags</p>
              {product.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-light-primary-text font-public-sans"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Media ──────────────────────────────── */}
      <div className="rounded-2xl border border-gray-500/20 bg-surface">
        <h3 className="border-b border-gray-500/20 px-4 py-4 text-lg font-bold text-light-primary-text sm:px-6 font-public-sans">
          Media
        </h3>
        <div className="p-4 sm:p-6">
          {product.images.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <ImageIcon size={26} className="text-gray-400" />
              <p className="text-sm font-semibold text-light-primary-text font-public-sans">No photos</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {product.images.map((img) => (
                <div key={img.id} className="relative size-24 overflow-hidden rounded-xl border border-gray-200">
                  {img.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={img.alt_text || product.name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-gray-400">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  {img.is_primary && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[10px] font-semibold text-white font-public-sans">
                      Main
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Variant ────────────────────────────── */}
      <div className="rounded-2xl border border-gray-500/20 bg-surface">
        <h3 className="border-b border-gray-500/20 px-4 py-4 text-lg font-bold text-light-primary-text sm:px-6 font-public-sans">
          Variant
        </h3>
        <div className="p-4 sm:p-6">
          {variants.length === 0 ? (
            <p className="text-sm text-light-secondary-text font-public-sans">This product has no variants.</p>
          ) : (
            <div className="rounded-lg border border-gray-200">
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className={TABLE_HEAD_ROW}>
                      {['SKU ID', 'Variant ID', 'Image', 'Color', 'Size', 'Price', 'Visible', 'Status'].map((h) => (
                        <th key={h} className={TABLE_TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id} className={TABLE_ROW}>
                        <td className={TABLE_TD}>{v.sku ? `#${v.sku}` : '—'}</td>
                        <td className={TABLE_TD}>{v.variant_code ? `#${v.variant_code}` : '—'}</td>
                        <td className={TABLE_TD}>
                          <div className="flex size-8 items-center justify-center rounded-lg bg-gray-100">
                            {v.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={v.image_url} alt={v.label} className="size-full rounded-lg object-cover" />
                            ) : (
                              <ImageIcon size={14} className="text-gray-400" />
                            )}
                          </div>
                        </td>
                        <td className={TABLE_TD}>{v.color || '—'}</td>
                        <td className={TABLE_TD}>{v.size || '—'}</td>
                        <td className={`${TABLE_TD} font-dm-sans`}>{money.format(Number(v.effective_price))}</td>
                        <td className={TABLE_TD}>{v.is_visible ? 'Visible' : 'Hidden'}</td>
                        <td className={TABLE_TD}>
                          <StatusPill label={v.status_label} tone={v.status === 'active' ? 'primary' : 'neutral'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
