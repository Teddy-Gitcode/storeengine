'use client';

import { useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import type { AdminCategory, AdminBrand, AdminTag } from '@/lib/admin-types';
import {
  FloatingInput, FloatingSelect, FloatingTextarea, PillButton, SectionCard, ToggleSwitch,
} from '@/components/sellzy/product-ui';
import { VariantDraftEditor } from '@/components/sellzy/product-variants';
import StatusListbox from '@/components/sellzy/status-listbox';
import EntityPicker from '@/components/sellzy/entity-picker';

const MAX_BYTES = 3.1 * 1024 * 1024;

/** Same slug rule as the model's `slugify` — shown as a preview, not enforced. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* The template's Media card: a dashed drop zone plus thumbnails of the picks. */
function MediaPicker({ name }: { name: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function pick(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const tooBig = picked.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} is larger than 3.1 MB.`);
      return;
    }
    setError(null);
    setFiles(picked);
  }

  return (
    <div className="space-y-3">
      <label className="group flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-500/30 bg-surface p-6 text-center transition-colors hover:bg-gray-50">
        <input
          type="file"
          name={name}
          multiple
          accept="image/jpeg,image/jpg,image/png,image/gif"
          aria-label="Product photos"
          className="sr-only"
          onChange={(e) => pick(e.target.files)}
        />
        <ImagePlus size={40} strokeWidth={1.25} className="mb-4 text-light-primary-text" />
        <p className="text-sm font-semibold text-light-secondary-text font-public-sans">Upload Product Photos</p>
        <p className="text-xs text-light-secondary-text font-public-sans">
          Allowed *.jpeg, *.jpg, *.png, *.gif
          <br />
          Max size of 3.1 MB — the first photo becomes the main one
        </p>
      </label>

      {error && <p className="text-xs text-error font-public-sans">{error}</p>}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative size-16 overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt={f.name} className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[10px] font-semibold text-white font-public-sans">
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewProductClient({
  categories,
  brands,
  tags,
  createAction,
}: {
  categories: AdminCategory[];
  brands: AdminBrand[];
  tags: AdminTag[];
  createAction: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [taxable, setTaxable] = useState(true);
  const featuredLabelId = useId();
  const taxableLabelId = useId();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAction(formData);
      if (result && 'error' in result && result.error) setError(result.error);
    });
  }

  return (
    <form action={submit} className="space-y-4 sm:space-y-6">
      <input type="hidden" name="is_featured" value={featured ? 'true' : 'false'} />
      <input type="hidden" name="is_taxable" value={taxable ? 'true' : 'false'} />

      {/* ─── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="flex size-8 items-center justify-center rounded-full text-light-primary-text transition-colors hover:bg-gray-200"
            aria-label="Back to products"
          >
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans sm:text-xl">Create Product</h2>
        </div>
        <StatusListbox
          name="status"
          defaultValue="draft"
          activeValue="active"
          options={[
            { value: 'active', label: 'Publish' },
            { value: 'draft', label: 'Draft' },
          ]}
        />
      </div>

      {/* ─── Basic Information ──────────────────── */}
      <SectionCard title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FloatingInput
            label="Product Name"
            name="name"
            value={name}
            onChange={(v) => { setName(v); if (!slugEdited) setSlug(slugify(v)); }}
            required
          />
          <FloatingInput
            label="Slug"
            name="slug"
            value={slug}
            onChange={(v) => { setSlug(v); setSlugEdited(true); }}
          />
          <FloatingSelect
            label="Category"
            name="category_id"
            required
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <FloatingSelect
            label="Brand"
            name="brand_id"
            options={[{ value: '', label: 'No brand' }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
          />
          <FloatingInput label="SKU" name="sku" />
          <FloatingInput label="Price" name="price" type="number" step="0.01" min="0" required />
          <FloatingInput label="Previous price (compare-at)" name="compare_at_price" type="number" step="0.01" min="0" />
          <FloatingInput label="Weight (grams)" name="weight_grams" type="number" min="0" />
          <FloatingInput label="HS code (customs)" name="hs_code" />
        </div>

        <div className="mt-4 sm:mt-6">
        {tags.length === 0 ? (
          <p className="text-sm text-light-secondary-text font-public-sans">
            No tags yet — create them under <Link href="/categories/tags" className="font-semibold text-primary">Tag List</Link>.
          </p>
        ) : (
          <EntityPicker
            items={tags}
            name="tag_ids"
            label="Select Tags"
            emptyLabel="All tags added"
            chooseLabel="Choose a tag…"
          />
        )}
        </div>
        <div className="mt-4 sm:mt-6">
          <FloatingTextarea label="Short Description" name="short_description" rows={2} />
        </div>
        <div className="mt-4 sm:mt-6">
          <FloatingTextarea label="Description" name="description" rows={5} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 sm:mt-6">
          <div className="flex items-center gap-3">
            <span id={featuredLabelId} className="text-sm font-semibold text-light-primary-text font-public-sans">Featured product</span>
            <ToggleSwitch
              checked={featured}
              onChange={setFeatured}
              labelledBy={featuredLabelId}
              label={featured ? 'Shown in featured collections' : 'Not featured'}
            />
          </div>
          <div className="flex items-center gap-3">
            <span id={taxableLabelId} className="text-sm font-semibold text-light-primary-text font-public-sans">Taxable</span>
            <ToggleSwitch
              checked={taxable}
              onChange={setTaxable}
              labelledBy={taxableLabelId}
              label={taxable ? 'Tax rules apply to this product' : 'Zero-rated / exempt'}
            />
          </div>
        </div>
      </SectionCard>

      {/* ─── Stock ──────────────────────────────── */}
      <SectionCard title="Stock">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FloatingInput label="Opening stock (pcs)" name="opening_stock" type="number" min="0" step="1" />
          <FloatingInput label="Reorder level" name="reorder_level" type="number" min="0" step="1" defaultValue="5" />
        </div>
        <p className="mt-3 text-xs text-light-secondary-text font-public-sans">
          How many you have on the shelf now. Selling in colours or sizes? Give each variant its own count below instead.
          The reorder level is when it shows as low on stock.
        </p>
      </SectionCard>

      {/* ─── Media ──────────────────────────────── */}
      <SectionCard title="Media">
        <MediaPicker name="images" />
      </SectionCard>

      {/* ─── Variant ────────────────────────────── */}
      <VariantDraftEditor name="variants" />

      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">
          <X size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <PillButton href="/products" variant="secondary">Cancel</PillButton>
        <PillButton type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</PillButton>
      </div>
    </form>
  );
}
