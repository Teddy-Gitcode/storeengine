'use client';

import { useId, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import StatusListbox from '@/components/sellzy/status-listbox';
import type { AdminBrand } from '@/lib/admin-types';
import { FloatingInput, FloatingSelect, FloatingTextarea, PillButton } from '@/components/sellzy/product-ui';

const MAX_BYTES = 3.1 * 1024 * 1024;

/* Slug helper — mirrors the backend's slugify so the field previews the same value. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* Dashed drop zone matching the template's image pickers (banner + logo). */
function ImageDrop({
  name,
  title,
  currentUrl,
}: {
  name: string;
  title: string;
  currentUrl?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = preview ?? currentUrl ?? null;

  function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 3.1 MB.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-2">
      <div className="w-full">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          name={name}
          aria-label={title}
          accept="image/jpeg,image/jpg,image/png,image/gif"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <label
          htmlFor={inputId}
          className="group relative flex h-full min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-500/30 bg-surface p-6 text-center transition-colors hover:bg-gray-50 overflow-hidden focus-within:border-primary"
        >
          {shown ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown} alt={title} className="absolute inset-0 h-full w-full object-contain p-4" />
              <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-light-secondary-text font-public-sans shadow-sm">
                Change
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-light-primary-text">
                <ImagePlus size={40} strokeWidth={1.25} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-light-secondary-text font-public-sans">{title}</p>
                <p className="text-xs text-light-secondary-text font-public-sans">
                  Allowed *.jpeg, *.jpg, *.png, *.gif
                  <br />
                  Max size of 3.1 MB
                </p>
              </div>
            </div>
          )}
        </label>
      </div>
      {error && <p className="text-xs text-error font-public-sans">{error}</p>}
    </div>
  );
}

export default function BrandForm({
  brand,
  action,
}: {
  brand?: AdminBrand;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const isEdit = Boolean(brand);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(brand?.name ?? '');
  const [slug, setSlug] = useState(brand?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(brand?.slug));

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await action(formData);
      if (result && 'error' in result && result.error) setError(result.error);
    });
  }

  return (
    <form action={submit} className="w-full bg-surface rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link
            href="/categories/brands"
            className="text-light-primary-text hover:bg-gray-200 size-8 rounded-full flex items-center justify-center transition-colors"
            aria-label="Back to brand list"
          >
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-lg sm:text-xl font-bold text-light-primary-text font-public-sans">
            {isEdit ? 'Edit Brand' : 'Create New Brand'}
          </h2>
        </div>
        <StatusListbox
          name="is_active"
          activeValue="true"
          options={[{ value: 'true', label: 'Publish' }, { value: 'false', label: 'Draft' }]}
          defaultValue={(brand?.is_active ?? true) ? 'true' : 'false'}
        />
      </div>

      <div className="rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-500/20">
        <h2 className="text-lg font-bold text-gray-900 mb-6 font-public-sans">Basic Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <ImageDrop name="banner" title="Brand Banner" currentUrl={brand?.banner_url || undefined} />
          <ImageDrop name="logo" title="Brand Logo" currentUrl={brand?.logo_url || undefined} />
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <FloatingInput
              label="Name"
              name="name"
              required
              value={name}
              onChange={(v) => {
                setName(v);
                if (!slugTouched) setSlug(slugify(v));
              }}
            />
            <FloatingInput
              label="Slug"
              name="slug"
              value={slug}
              onChange={(v) => {
                setSlugTouched(true);
                setSlug(v);
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <FloatingInput label="Website URL" name="website" type="url" defaultValue={brand?.website ?? ''} />
            <FloatingSelect
              label="Sort Order"
              name="sort_order"
              defaultValue={brand?.sort_order ?? 0}
              options={Array.from({ length: 21 }, (_, i) => ({
                value: i,
                label: i === 0 ? '0 — default' : String(i),
              }))}
            />
          </div>

          <FloatingTextarea
            label="Short Description"
            name="description"
            defaultValue={brand?.description ?? ''}
            rows={4}
            className="[&>textarea]:h-32"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <PillButton href="/categories/brands" variant="secondary">Cancel</PillButton>
        <PillButton type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save' : 'Create Brand'}
        </PillButton>
      </div>
    </form>
  );
}
