'use client';

import { useActionState, useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import type { AdminAddonGroup, AdminBrand, AdminCategory, AdminProduct, AdminReview, AdminTag } from '@/lib/admin-types';
import { storefrontUrl } from '@/lib/storefront';
import {
  FloatingInput, FloatingSelect, FloatingTextarea, IconAction, PillButton,
  SectionCard, StatusPill, ToggleSwitch, TABLE_HEAD_ROW, TABLE_ROW, TABLE_TD, TABLE_TH,
  type PillTone,
} from '@/components/sellzy/product-ui';
import { VariantTable } from '@/components/sellzy/product-variants';
import { AddonsCard } from '@/components/sellzy/product-addons';
import GuardedForm from '@/components/sellzy/unsaved-changes';
import EntityPicker from '@/components/sellzy/entity-picker';
import {
  ArrowLeft, ArrowUp, ArrowDown, BadgeCheck, Check, ExternalLink, Film,
  Image as ImageIcon, Link2, MessageSquare, Plus, Save, Star, Trash2, Undo2, UploadCloud,
} from 'lucide-react';

type Action = (formData: FormData) => void | Promise<void>;
/** Returns the server's message on failure, null on success. */
type DetailsAction = (prev: string | null, formData: FormData) => Promise<string | null>;

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= rating ? 'text-warning' : 'text-gray-300'} fill={i <= rating ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

function SaveButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <PillButton type="submit" disabled={pending}>
      {pending ? 'Saving…' : children}
    </PillButton>
  );
}

function IconSubmit({ title, danger, children }: { title?: string; danger?: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <IconAction type="submit" title={title} danger={danger}>
      <span style={pending ? { opacity: 0.4 } : undefined}>{children}</span>
    </IconAction>
  );
}

/** Comma-separated id list with items i and j swapped — used for up/down reordering. */
function swappedIds(items: { id: number }[], i: number, j: number) {
  const ids = items.map((it) => it.id);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids.join(',');
}

/** The template puts destructive actions at the foot of the editor. */
function DeleteProduct({
  slug,
  action,
}: {
  slug: string;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    const fd = new FormData();
    fd.set('slug', slug);
    startTransition(async () => {
      const result = await action(fd);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-error/30 bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans">Delete product</h2>
          <p className="text-xs text-light-secondary-text font-public-sans">
            Permanent. Products with order history or stock records can only be archived.
          </p>
        </div>
        {confirming ? (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-full bg-error px-4 py-1 h-7.5 text-[13px] font-bold text-white transition-colors hover:bg-error-dark disabled:opacity-50 font-public-sans"
            >
              {pending ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full px-4 py-1 h-7.5 text-[13px] font-bold text-light-secondary-text transition-colors hover:bg-gray-100 font-public-sans"
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-error px-4 py-1 h-7.5 text-[13px] font-bold text-error transition-colors hover:bg-error/10 font-public-sans"
          >
            <Trash2 size={13} />Delete product
          </button>
        )}
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{error}</p>
      )}
    </div>
  );
}

export default function ProductEditorClient({
  product,
  categories,
  brands,
  tags,
  reviews,
  saveDetailsAction,
  saveStockAction,
  deleteProductAction,
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
  addonGroups,
  currency,
  createAddonGroupAction,
  updateAddonGroupAction,
  deleteAddonGroupAction,
  createAddonAction,
  updateAddonAction,
  deleteAddonAction,
  uploadPhotoAction,
  addPhotoUrlAction,
  savePhotoAltAction,
  setPrimaryPhotoAction,
  reorderPhotosAction,
  deletePhotoAction,
  addVideoAction,
  saveVideoAction,
  reorderVideosAction,
  deleteVideoAction,
  approveReviewAction,
  rejectReviewAction,
}: {
  product: AdminProduct;
  categories: AdminCategory[];
  brands: AdminBrand[];
  tags: AdminTag[];
  reviews: AdminReview[];
  saveDetailsAction: DetailsAction;
  saveStockAction: DetailsAction;
  deleteProductAction: (formData: FormData) => Promise<{ error?: string } | void>;
  createVariantAction: Action;
  updateVariantAction: Action;
  deleteVariantAction: Action;
  addonGroups: AdminAddonGroup[];
  currency: string;
  createAddonGroupAction: Action;
  updateAddonGroupAction: Action;
  deleteAddonGroupAction: Action;
  createAddonAction: Action;
  updateAddonAction: Action;
  deleteAddonAction: Action;
  uploadPhotoAction: Action;
  addPhotoUrlAction: Action;
  savePhotoAltAction: Action;
  setPrimaryPhotoAction: Action;
  reorderPhotosAction: Action;
  deletePhotoAction: Action;
  addVideoAction: Action;
  saveVideoAction: Action;
  reorderVideosAction: Action;
  deleteVideoAction: Action;
  approveReviewAction: Action;
  rejectReviewAction: Action;
}) {
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('upload');
  const [detailsError, saveDetails] = useActionState(saveDetailsAction, null);
  const [stockError, saveStock] = useActionState(saveStockAction, null);
  const [backorder, setBackorder] = useState(product.stock?.allow_backorder ?? false);
  const [featured, setFeatured] = useState(product.is_featured);
  const [taxable, setTaxable] = useState(product.is_taxable);
  const images = product.images;
  const videos = product.videos ?? [];
  const pendingReviews = reviews.filter((r) => !r.is_approved).length;
  const featuredToggleId = useId();
  const backorderToggleId = useId();
  const onHand = product.stock?.quantity_on_hand ?? 0;
  const reorderAt = product.stock?.reorder_level ?? 0;
  /* Same three-way reading as the stock page, so a product cannot look healthy
     here and low there. */
  const stockTone = !product.stock
    ? { label: 'Untracked', tone: 'neutral' as PillTone, color: undefined }
    : onHand <= 0
      ? { label: 'Out of stock', tone: 'error' as PillTone, color: '#cb0233' }
      : onHand <= reorderAt
        ? { label: 'Low stock', tone: 'warning' as PillTone, color: '#b78103' }
        : { label: 'In stock', tone: 'success' as PillTone, color: undefined };
  /* Re-baselines the guard only when the server confirms a stock write. The
     product row's own updated_at does not move when only the StockItem does. */
  const stockUpdatedKey = `${product.stock?.id ?? 0}:${onHand}:${reorderAt}:${product.stock?.allow_backorder ?? false}`;
  const taxableToggleId = useId();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/products" className="text-light-primary-text hover:bg-gray-200 size-8 rounded-full flex items-center justify-center transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-lg sm:text-xl font-bold text-light-primary-text font-public-sans">Product Details</h2>
        </div>
        <a
          href={storefrontUrl(`/product/${product.slug}`)}
          target="_blank"
          rel="noreferrer"
          className="rounded-full inline-flex items-center justify-center gap-1.5 cursor-pointer font-bold transition-colors border border-gray-300 text-light-secondary-text hover:bg-gray-50 px-4 py-1 h-7.5 text-[13px] leading-5.5 font-public-sans"
        >
          <ExternalLink size={13} />View on storefront
        </a>
      </div>

      {/* ─── Jump bar ───────────────────────────── */}
      {/* The editor is eight cards long; this keeps every part one click away
          instead of a long scroll past the ones you didn't come for. */}
      <nav
        aria-label="Product sections"
        className="no-scrollbar sticky top-[68px] z-20 -mx-1 flex gap-1 overflow-x-auto rounded-full border border-gray-500/20 bg-surface/95 p-1 backdrop-blur"
      >
        {[
          ['details', 'Details'],
          ['stock', 'Stock'],
          ['photos', `Photos · ${images.length}`],
          ['variants', `Variants · ${(product.variants ?? []).length}`],
          ['addons', 'Add-ons'],
          ['videos', 'Videos'],
          ['reviews', `Reviews · ${reviews.length}`],
          ['delete', 'Delete'],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold font-public-sans transition-colors ${
              id === 'delete' ? 'text-error hover:bg-error/10' : 'text-light-secondary-text hover:bg-gray-100 hover:text-light-primary-text'
            }`}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* ─── Details (Basic Information) ───────────────────────── */}
      <section id="details" className="scroll-mt-32">
      <GuardedForm action={saveDetails} resetKey={product.updated_at} deps={[featured, taxable]}>
        <input type="hidden" name="slug" value={product.slug} />
        <input type="hidden" name="is_featured" value={featured ? 'true' : 'false'} />
        <input type="hidden" name="is_taxable" value={taxable ? 'true' : 'false'} />
        <div className="border rounded-2xl border-gray-500/20 bg-surface">
          <h2 className="text-lg py-4 px-6 font-bold text-light-primary-text border-b border-gray-500/20 font-public-sans">Basic Information</h2>
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center pb-4 sm:pb-6">
              <div className="rounded-full size-20 shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
                {images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[0].url} alt={product.name} className="object-cover rounded-full w-full h-full" />
                ) : (
                  <ImageIcon size={26} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-light-primary-text font-public-sans">{product.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-light-secondary-text font-public-sans">
                    <span>{product.category.name}</span>
                    {product.sku && <span className="font-mono">SKU {product.sku}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FloatingInput label="Product Name" name="name" defaultValue={product.name} required />
              <FloatingInput label="SKU" name="sku" defaultValue={product.sku} />
              <FloatingSelect
                label="Category"
                name="category_id"
                defaultValue={product.category.id}
                required
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <FloatingSelect
                label="Status"
                name="status"
                defaultValue={product.status}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Publish' },
                  { value: 'archived', label: 'Archived' },
                ]}
              />
              <FloatingSelect
                label="Brand"
                name="brand_id"
                defaultValue={product.brand?.id ?? ''}
                options={[{ value: '', label: 'No brand' }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
              />
              <FloatingInput label="Price" name="price" type="number" step="0.01" min="0" defaultValue={product.price} required />
              <FloatingInput label="Compare-at price" name="compare_at_price" type="number" step="0.01" min="0" defaultValue={product.compare_at_price ?? ''} />
              <FloatingInput label="Weight (grams)" name="weight_grams" type="number" min="0" defaultValue={product.weight_grams} />
              <FloatingInput label="HS code (customs)" name="hs_code" defaultValue={product.hs_code} />
            </div>

            <div className="mt-4 sm:mt-6">
              {tags.length === 0 ? (
                <p className="text-sm text-light-secondary-text font-public-sans">
                  No tags yet — create them under{' '}
                  <Link href="/categories/tags" className="font-semibold text-primary">Tag List</Link>.
                </p>
              ) : (
                <EntityPicker
                  items={tags}
                  selectedIds={product.tags.map((t) => t.id)}
                  name="tag_ids"
                  label="Select Tags"
                  emptyLabel="All tags added"
                  chooseLabel="Choose a tag…"
                />
              )}
            </div>

            <div className="mt-4 sm:mt-6">
              <FloatingTextarea label="Short Description" name="short_description" defaultValue={product.short_description} rows={2} />
            </div>
            <div className="mt-4 sm:mt-6">
              <FloatingTextarea label="Description" name="description" defaultValue={product.description} rows={5} />
            </div>

            <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-3">
                <span id={featuredToggleId} className="text-sm font-semibold text-light-primary-text font-public-sans">Featured product</span>
                <ToggleSwitch
                  checked={featured}
                  onChange={setFeatured}
                  labelledBy={featuredToggleId}
                  label={featured ? 'Shown in featured collections' : 'Not featured'}
                />
              </div>
              <div className="flex items-center gap-3">
                <span id={taxableToggleId} className="text-sm font-semibold text-light-primary-text font-public-sans">Taxable</span>
                <ToggleSwitch
                  checked={taxable}
                  onChange={setTaxable}
                  labelledBy={taxableToggleId}
                  label={taxable ? 'Tax rules apply to this product' : 'Zero-rated / exempt'}
                />
              </div>
            </div>

            {detailsError && (
              <p className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{detailsError}</p>
            )}

            <div className="flex items-center justify-end gap-4 pt-4 sm:pt-6">
              <SaveButton><Save size={13} />Save details</SaveButton>
            </div>
          </div>
        </div>
      </GuardedForm>
      </section>

      {/* ─── Stock ──────────────────────────────────────── */}
      <section id="stock" className="scroll-mt-32">
      <GuardedForm action={saveStock} resetKey={stockUpdatedKey} deps={[backorder]}>
        <input type="hidden" name="slug" value={product.slug} />
        <input type="hidden" name="product_id" value={product.id} />
        <input type="hidden" name="stock_id" value={product.stock?.id ?? ''} />
        <input type="hidden" name="allow_backorder" value={backorder ? 'true' : 'false'} />
        <SectionCard
          title="Stock"
          action={
            <Link
              href="/products/stocks"
              className="text-xs font-semibold text-primary hover:underline font-public-sans"
            >
              All stock levels
            </Link>
          }
        >
          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pb-4 sm:pb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-light-secondary-text font-public-sans">
                  On hand
                </p>
                <p
                  className="text-3xl font-bold font-dm-sans tabular-nums"
                  style={{ color: stockTone.color }}
                >
                  {onHand}{' '}
                  <span className="text-base font-semibold text-light-secondary-text">
                    {product.stock?.unit || 'pcs'}
                  </span>
                </p>
              </div>
              <StatusPill label={stockTone.label} tone={stockTone.tone} />
              {!product.stock && (
                <p className="text-sm text-light-secondary-text font-public-sans">
                  Not stock-tracked yet — the first adjustment starts tracking it.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FloatingInput
                label="Adjust quantity by (+/-)"
                name="quantity_delta"
                type="number"
                step="1"
                defaultValue=""
              />
              <FloatingSelect
                label="Reason"
                name="reason"
                defaultValue="adjustment"
                options={[
                  { value: 'adjustment', label: 'Adjustment' },
                  { value: 'restock', label: 'Restock' },
                  { value: 'return', label: 'Return' },
                ]}
              />
              <FloatingInput
                label="Reorder level"
                name="reorder_level"
                type="number"
                min="0"
                defaultValue={product.stock?.reorder_level ?? 0}
              />
              <FloatingInput label="Note (optional)" name="note" defaultValue="" />
            </div>

            <div className="mt-4 sm:mt-6 flex items-center gap-3">
              <span id={backorderToggleId} className="text-sm font-semibold text-light-primary-text font-public-sans">
                Allow backorders
              </span>
              <ToggleSwitch
                checked={backorder}
                onChange={setBackorder}
                labelledBy={backorderToggleId}
                label={
                  backorder
                    ? 'Shoppers can keep buying past zero, and the count may go negative'
                    : 'Sales stop at zero'
                }
              />
            </div>

            {stockError && (
              <p className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{stockError}</p>
            )}

            <div className="flex items-center justify-end gap-4 pt-4 sm:pt-6">
              <SaveButton><Save size={13} />Save stock</SaveButton>
            </div>
          </div>
        </SectionCard>
      </GuardedForm>
      </section>

      {/* ─── Media / Photos ─────────────────────────────── */}
      <section id="photos" className="scroll-mt-32">
      <SectionCard
        title={`Media · ${images.length} photo${images.length === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center rounded-full bg-gray-100 p-0.5 text-xs font-public-sans">
            <button type="button" onClick={() => setPhotoMode('upload')} className={`px-3 py-1 rounded-full font-semibold transition-colors ${photoMode === 'upload' ? 'bg-surface text-light-primary-text shadow-sm' : 'text-light-secondary-text'}`}>
              <UploadCloud size={12} className="inline mr-1 -mt-0.5" />Upload
            </button>
            <button type="button" onClick={() => setPhotoMode('url')} className={`px-3 py-1 rounded-full font-semibold transition-colors ${photoMode === 'url' ? 'bg-surface text-light-primary-text shadow-sm' : 'text-light-secondary-text'}`}>
              <Link2 size={12} className="inline mr-1 -mt-0.5" />From URL
            </button>
          </div>
        }
      >
        {photoMode === 'upload' ? (
          <form action={uploadPhotoAction} className="mb-5" key="upload">
            <input type="hidden" name="slug" value={product.slug} />
            <input type="hidden" name="product_id" value={product.id} />
            <input type="hidden" name="sort_order" value={images.length} />
            <div className="grid grid-cols-1 gap-4">
              <label className="group relative flex h-full min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-surface p-6 text-center transition-colors hover:bg-gray-50">
                {/* Uploads as soon as a file is picked — the extra "Upload photo"
                    press was a second step nobody needed. Alt text is edited
                    on the photo once it is in. */}
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  required
                  aria-label="Product photo"
                  className="sr-only"
                  onChange={(e) => { if (e.currentTarget.files?.length) e.currentTarget.form?.requestSubmit(); }}
                />
                <UploadCloud size={28} className="text-light-secondary-text mb-2" />
                <p className="text-sm font-semibold text-light-secondary-text font-public-sans">Add a photo</p>
                <p className="text-xs text-light-secondary-text font-public-sans">Click to choose — it uploads straight away · *.jpeg, *.jpg, *.png, *.gif</p>
              </label>
            </div>
          </form>
        ) : (
          <form action={addPhotoUrlAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5" key="url">
            <input type="hidden" name="slug" value={product.slug} />
            <input type="hidden" name="product_id" value={product.id} />
            <input type="hidden" name="sort_order" value={images.length} />
            <FloatingInput label="Image URL" name="source_url" type="url" required />
            <div className="flex items-center gap-3">
              <FloatingInput label="Alt text (optional)" name="alt_text" className="flex-1" />
              <SaveButton><Plus size={13} />Add</SaveButton>
            </div>
          </form>
        )}

        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <ImageIcon size={26} className="text-gray-400" />
            <p className="text-sm font-semibold text-light-primary-text font-public-sans">No photos yet</p>
            <p className="text-xs text-light-secondary-text font-public-sans">Upload a file or add an image URL to give this product a gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img, i) => (
              <div key={img.id} className="rounded-xl border border-gray-500/20 p-3">
                <div className="relative rounded-lg overflow-hidden mb-3 bg-gray-100" style={{ aspectRatio: '4 / 3' }}>
                  {img.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={img.alt_text || product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon size={22} />
                    </div>
                  )}
                  {img.is_primary && (
                    <span className="absolute top-2 left-2 rounded-full bg-surface shadow-sm">
                      <StatusPill label="Primary" tone="success" />
                    </span>
                  )}
                </div>

                <form action={savePhotoAltAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="slug" value={product.slug} />
                  <input type="hidden" name="id" value={img.id} />
                  <input
                    className="flex-1 min-w-0 h-9 px-3 rounded-full border border-gray-300 text-xs focus:outline-none focus:border-primary font-public-sans"
                    name="alt_text"
                    defaultValue={img.alt_text}
                    placeholder="Alt text…"
                  />
                  <IconSubmit title="Save alt text"><Save size={14} /></IconSubmit>
                </form>

                <div className="flex items-center gap-0.5 mt-2">
                  {!img.is_primary && (
                    <form action={setPrimaryPhotoAction}>
                      <input type="hidden" name="slug" value={product.slug} />
                      <input type="hidden" name="product_id" value={product.id} />
                      <input type="hidden" name="id" value={img.id} />
                      <IconSubmit title="Set as primary"><Star size={14} /></IconSubmit>
                    </form>
                  )}
                  {i > 0 && (
                    <form action={reorderPhotosAction}>
                      <input type="hidden" name="slug" value={product.slug} />
                      <input type="hidden" name="ids" value={swappedIds(images, i, i - 1)} />
                      <IconSubmit title="Move up"><ArrowUp size={14} /></IconSubmit>
                    </form>
                  )}
                  {i < images.length - 1 && (
                    <form action={reorderPhotosAction}>
                      <input type="hidden" name="slug" value={product.slug} />
                      <input type="hidden" name="ids" value={swappedIds(images, i, i + 1)} />
                      <IconSubmit title="Move down"><ArrowDown size={14} /></IconSubmit>
                    </form>
                  )}
                  <div className="flex-1" />
                  <form action={deletePhotoAction}>
                    <input type="hidden" name="slug" value={product.slug} />
                    <input type="hidden" name="id" value={img.id} />
                    <IconSubmit title="Delete photo" danger><Trash2 size={14} /></IconSubmit>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      </section>

      {/* ─── Variants ───────────────────────────── */}
      <section id="variants" className="scroll-mt-32">
      <VariantTable
        productId={product.id}
        slug={product.slug}
        variants={product.variants ?? []}
        createAction={createVariantAction}
        updateAction={updateVariantAction}
        deleteAction={deleteVariantAction}
      />
      </section>

      {/* ─── Add-ons ────────────────────────────── */}
      <section id="addons" className="scroll-mt-32">
      <AddonsCard
        productId={product.id}
        slug={product.slug}
        groups={addonGroups}
        currency={currency}
        createGroupAction={createAddonGroupAction}
        updateGroupAction={updateAddonGroupAction}
        deleteGroupAction={deleteAddonGroupAction}
        createAddonAction={createAddonAction}
        updateAddonAction={updateAddonAction}
        deleteAddonAction={deleteAddonAction}
      />
      </section>

      {/* ─── Videos ─────────────────────────────── */}
      <section id="videos" className="scroll-mt-32">
      <SectionCard title={`Videos · ${videos.length}`}>
        <form action={addVideoAction} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <input type="hidden" name="slug" value={product.slug} />
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="sort_order" value={videos.length} />
          <FloatingInput label="Title" name="title" />
          <FloatingInput label="Video URL" name="video_url" type="url" required />
          <div className="flex items-center gap-3">
            <FloatingInput label="Thumbnail URL" name="thumbnail_url" type="url" className="flex-1" />
            <SaveButton><Plus size={13} />Add</SaveButton>
          </div>
        </form>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Film size={26} className="text-gray-400" />
            <p className="text-sm font-semibold text-light-primary-text font-public-sans">No videos yet</p>
            <p className="text-xs text-light-secondary-text font-public-sans">Add a YouTube, Vimeo, or direct video link to enrich this product page.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-500/20">
            {videos.map((v, i) => (
              <div key={v.id} className="flex flex-wrap items-end gap-3 py-4 first:pt-0 last:pb-0">
                <form action={saveVideoAction} className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-0">
                  <input type="hidden" name="slug" value={product.slug} />
                  <input type="hidden" name="id" value={v.id} />
                  <FloatingInput label="Title" name="title" defaultValue={v.title} />
                  <FloatingInput label="Video URL" name="video_url" type="url" defaultValue={v.video_url} required />
                  <div className="flex items-center gap-2">
                    <FloatingInput label="Thumbnail URL" name="thumbnail_url" type="url" defaultValue={v.thumbnail_url} className="flex-1" />
                    <SaveButton><Save size={13} /></SaveButton>
                  </div>
                </form>
                <div className="flex items-center gap-0.5">
                  {i > 0 && (
                    <form action={reorderVideosAction}>
                      <input type="hidden" name="slug" value={product.slug} />
                      <input type="hidden" name="ids" value={swappedIds(videos, i, i - 1)} />
                      <IconSubmit title="Move up"><ArrowUp size={14} /></IconSubmit>
                    </form>
                  )}
                  {i < videos.length - 1 && (
                    <form action={reorderVideosAction}>
                      <input type="hidden" name="slug" value={product.slug} />
                      <input type="hidden" name="ids" value={swappedIds(videos, i, i + 1)} />
                      <IconSubmit title="Move down"><ArrowDown size={14} /></IconSubmit>
                    </form>
                  )}
                  <form action={deleteVideoAction}>
                    <input type="hidden" name="slug" value={product.slug} />
                    <input type="hidden" name="id" value={v.id} />
                    <IconSubmit title="Delete video" danger><Trash2 size={14} /></IconSubmit>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      </section>

      {/* ─── Reviews ────────────────────────────── */}
      <section id="reviews" className="scroll-mt-32">
      <SectionCard
        title={`Reviews · ${reviews.length}`}
        action={
          <div className="flex items-center gap-3">
            {pendingReviews > 0 && <StatusPill label={`${pendingReviews} pending`} tone="warning" />}
            <Link href="/products/review" className="text-xs font-semibold text-primary font-public-sans">Moderate all reviews</Link>
          </div>
        }
      >
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <MessageSquare size={26} className="text-gray-400" />
            <p className="text-sm font-semibold text-light-primary-text font-public-sans">No reviews for this product yet</p>
            <p className="text-xs text-light-secondary-text font-public-sans">Customer reviews land here once shoppers start writing them.</p>
          </div>
        ) : (
          <div className="relative w-full overflow-auto -mx-4 sm:-mx-6">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={TABLE_TH}>Reviewer</th>
                  <th className={TABLE_TH}>Rating</th>
                  <th className={TABLE_TH}>Review</th>
                  <th className={TABLE_TH}>Status</th>
                  <th className={TABLE_TH}>Date</th>
                  <th className={TABLE_TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className={TABLE_ROW}>
                    <td className={`${TABLE_TD} whitespace-nowrap text-light-secondary-text`}>
                      {r.display_name}
                      {r.is_verified_purchase && <BadgeCheck size={12} className="inline ml-1 -mt-0.5 text-success" aria-label="Verified purchase" />}
                    </td>
                    <td className={TABLE_TD}><Stars rating={r.rating} /></td>
                    <td className={`${TABLE_TD} max-w-[280px]`}>
                      {r.title && <p className="text-xs font-semibold text-light-primary-text font-public-sans">{r.title}</p>}
                      <p className="text-xs text-light-secondary-text truncate font-public-sans" title={r.body}>{r.body}</p>
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}>
                      <StatusPill label={r.is_approved ? 'Published' : 'Pending'} tone={r.is_approved ? 'success' : 'warning'} />
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap text-light-secondary-text`}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className={`${TABLE_TD} whitespace-nowrap`}>
                      {r.is_approved ? (
                        <form action={rejectReviewAction}>
                          <input type="hidden" name="slug" value={product.slug} />
                          <input type="hidden" name="id" value={r.id} />
                          <IconSubmit title="Unpublish"><Undo2 size={16} /></IconSubmit>
                        </form>
                      ) : (
                        <form action={approveReviewAction}>
                          <input type="hidden" name="slug" value={product.slug} />
                          <input type="hidden" name="id" value={r.id} />
                          <IconSubmit title="Approve & publish"><Check size={16} /></IconSubmit>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-light-secondary-text pt-4 font-public-sans">
          Only approved reviews are visible to shoppers on the storefront and mobile app.
        </p>
      </SectionCard>
      </section>

      {/* ─── Danger zone ────────────────────────── */}
      <section id="delete" className="scroll-mt-32">
      <DeleteProduct slug={product.slug} action={deleteProductAction} />
      </section>
    </div>
  );
}
