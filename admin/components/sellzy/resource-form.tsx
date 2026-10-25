'use client';

import { useId, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { FloatingInput, FloatingSelect, FloatingTextarea, PillButton } from '@/components/sellzy/product-ui';
import StatusListbox from '@/components/sellzy/status-listbox';
import AddressPicker from '@/components/ui/AddressPicker';
import CtaLinkField, { type LinkCategory, type LinkProduct } from '@/app/content/CtaLinkField';

const MAX_BYTES = 3.1 * 1024 * 1024;

/* `hint` prints under the field — for rules the label can't carry, like how a
   value has to be written for the storefront to match it. */
export type ResourceField =
  | { kind: 'text' | 'url' | 'number' | 'date' | 'datetime-local' | 'password'; name: string; label: string; defaultValue?: string | number; required?: boolean; half?: boolean; hint?: string }
  | { kind: 'textarea'; name: string; label: string; defaultValue?: string; rows?: number; hint?: string }
  | { kind: 'select'; name: string; label: string; defaultValue?: string | number; options: { value: string | number; label: string }[]; half?: boolean; hint?: string }
  /* Checkbox list submitting many values under one name — for the m2m fields
     a single select cannot express (a flash sale holding several products). */
  | { kind: 'multiselect'; name: string; label: string; defaultValue?: (string | number)[]; options: { value: string | number; label: string }[]; hint?: string }
  /* Hex colour with a live swatch. Leaving it empty is meaningful: the
     storefront then falls back to the palette the section ships with. */
  | { kind: 'color'; name: string; label: string; defaultValue?: string; placeholder?: string; half?: boolean; hint?: string }
  | { kind: 'image'; name: string; label: string; currentUrl?: string }
  /* Search box + draggable map pin, submitting three hidden inputs: the two
     coordinates and how they were arrived at. Spans the full width — a map in
     a half-column is too small to aim with. */
  | { kind: 'geo'; name: string; label: string; latitude?: number | null; longitude?: number | null; source?: string; hint?: string }
  /* Where a link goes, picked from the store's categories, products and pages
     instead of typed. `noneLabel` is the choice that submits an empty value. */
  | { kind: 'link'; name: string; label: string; defaultValue?: string; categories: LinkCategory[]; products: LinkProduct[]; noneLabel?: string; hint?: string }
  /* Carries a value the action needs (a record id) without drawing a field. */
  | { kind: 'hidden'; name: string; value: string | number };

/* Dashed image drop zone — the template's upload box, with its size rule. */
function ImageDrop({ name, label, currentUrl }: { name: string; label: string; currentUrl?: string }) {
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
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        name={name}
        aria-label={label}
        accept="image/jpeg,image/jpg,image/png,image/gif"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <label
        htmlFor={inputId}
        className="group relative flex h-full min-h-[200px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-500/30 bg-surface p-6 text-center transition-colors hover:bg-gray-50 focus-within:border-primary"
      >
        {shown ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shown} alt={label} className="absolute inset-0 h-full w-full object-contain p-4" />
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
              <p className="text-sm font-semibold text-light-secondary-text font-public-sans">{label}</p>
              <p className="text-xs text-light-secondary-text font-public-sans">
                Allowed *.jpeg, *.jpg, *.png, *.gif
                <br />
                Max size of 3.1 MB
              </p>
            </div>
          </div>
        )}
      </label>
      {error && <p className="text-xs text-error font-public-sans">{error}</p>}
    </div>
  );
}

/* Scrollable checkbox list. Renders an empty hidden input alongside so that
   clearing every box actually clears the relation — a form omits unchecked
   boxes entirely, which the server would otherwise read as "no change". */
function CheckboxList({
  name,
  label,
  options,
  defaultValue = [],
}: {
  name: string;
  label: string;
  options: { value: string | number; label: string }[];
  defaultValue?: (string | number)[];
}) {
  const selected = new Set(defaultValue.map(String));
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;

  return (
    <div className="rounded-xl border border-gray-300 p-3">
      <input type="hidden" name={name} value="" />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-light-primary-text font-public-sans">{label}</p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="h-8 w-40 rounded-full border border-gray-300 px-3 text-xs text-light-primary-text focus:border-primary focus:outline-none font-public-sans"
        />
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
        {shown.length === 0 && (
          <p className="py-2 text-xs text-light-secondary-text font-public-sans">Nothing matches “{query}”.</p>
        )}
        {shown.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-light-primary-text transition-colors hover:bg-gray-50 font-public-sans"
          >
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={selected.has(String(o.value))}
              className="size-4 accent-primary"
            />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* Hex text input with a swatch that doubles as a colour picker. The text is
   what submits, so the field can be left empty. */
function ColorField({
  name,
  label,
  defaultValue = '',
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);

  return (
    <div className="relative">
      <div className="flex h-14 items-center gap-2 rounded-full border border-gray-300 pl-3.5 pr-2 focus-within:border-primary">
        <input
          id={id}
          type="text"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm leading-5 text-light-primary-text focus:outline-none font-public-sans"
        />
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-gray-300">
          <span
            className="block size-full"
            style={{ background: valid ? value : 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 10px 10px' }}
          />
          <input
            type="color"
            aria-label={`${label} picker`}
            value={valid ? value : '#000000'}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
      <label
        htmlFor={id}
        className="absolute start-1 -top-2 left-3.5 origin-left scale-75 bg-surface px-1 text-sm text-primary pointer-events-none font-public-sans"
      >
        {label}
      </label>
    </div>
  );
}

function Field({ field }: { field: ResourceField }) {
  const hint = 'hint' in field && field.hint ? field.hint : null;
  if (!hint) return <Control field={field} />;
  return (
    <div className="space-y-1.5">
      <Control field={field} />
      <p className="px-1 text-xs text-light-secondary-text font-public-sans">{hint}</p>
    </div>
  );
}

function Control({ field }: { field: ResourceField }) {
  switch (field.kind) {
    case 'hidden':
      return <input type="hidden" name={field.name} value={field.value} />;
    case 'textarea':
      return (
        <FloatingTextarea
          label={field.label}
          name={field.name}
          defaultValue={field.defaultValue}
          rows={field.rows ?? 4}
        />
      );
    case 'select':
      return (
        <FloatingSelect
          label={field.label}
          name={field.name}
          defaultValue={field.defaultValue}
          options={field.options}
        />
      );
    case 'multiselect':
      return (
        <CheckboxList
          name={field.name}
          label={field.label}
          options={field.options}
          defaultValue={field.defaultValue}
        />
      );
    case 'color':
      return (
        <ColorField
          name={field.name}
          label={field.label}
          defaultValue={field.defaultValue}
          placeholder={field.placeholder}
        />
      );
    case 'link':
      return (
        <CtaLinkField
          name={field.name}
          label={field.label}
          defaultValue={field.defaultValue ?? ''}
          categories={field.categories}
          products={field.products}
          noneLabel={field.noneLabel}
        />
      );
    case 'image':
      return <ImageDrop name={field.name} label={field.label} currentUrl={field.currentUrl} />;
    case 'geo':
      return (
        <AddressPicker
          label={field.label}
          latitudeName={`${field.name}_latitude`}
          longitudeName={`${field.name}_longitude`}
          sourceName={`${field.name}_source`}
          defaultLatitude={field.latitude ?? null}
          defaultLongitude={field.longitude ?? null}
          defaultSource={field.source ?? ''}
        />
      );
    default:
      return (
        <FloatingInput
          label={field.label}
          name={field.name}
          type={field.kind === 'text' ? 'text' : field.kind}
          defaultValue={field.defaultValue}
          required={field.required}
        />
      );
  }
}

/**
 * The template's add/edit page shell: back arrow + title + Publish pill, a
 * "Basic Information" card holding the fields, then Cancel / Save.
 * Image fields render as a two-up row above the rest, as in the template.
 */
export default function ResourceForm({
  title,
  backHref,
  fields,
  action,
  submitLabel = 'Save',
  status,
  children,
}: {
  title: string;
  backHref: string;
  fields: ResourceField[];
  /* Extra cards below Basic Information — a picker, a nested table. */
  children?: React.ReactNode;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  submitLabel?: string;
  status?: {
    name: string;
    defaultValue: string;
    /** The value that gets the green "live" treatment. */
    publishedValue: string;
    /* Two-state pill (Publish / Draft) — the common case. Resources with more
       states than that pass `options` instead. */
    draftValue?: string;
    publishedLabel?: string;
    draftLabel?: string;
    /** Full option list, for resources with more than two states. */
    options?: { value: string; label: string }[];
  };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await action(formData);
      if (result && 'error' in result && result.error) setError(result.error);
    });
  }

  const images = fields.filter((f) => f.kind === 'image');
  const hidden = fields.filter((f) => f.kind === 'hidden');
  const rest = fields.filter((f) => f.kind !== 'image' && f.kind !== 'hidden');

  return (
    <form action={submit} className="w-full rounded-2xl bg-surface p-4 sm:p-6">
      {hidden.map((f) => <Field key={f.name} field={f} />)}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            className="flex size-8 items-center justify-center rounded-full text-light-primary-text transition-colors hover:bg-gray-200"
            aria-label="Back to list"
          >
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans sm:text-xl">{title}</h2>
        </div>
        {status && (
          <StatusListbox
            name={status.name}
            defaultValue={status.defaultValue}
            activeValue={status.publishedValue}
            options={
              status.options ?? [
                { value: status.publishedValue, label: status.publishedLabel ?? 'Publish' },
                { value: status.draftValue ?? 'draft', label: status.draftLabel ?? 'Draft' },
              ]
            }
          />
        )}
      </div>

      <div className="mb-4 rounded-2xl border border-gray-500/20 p-4 sm:mb-6 sm:p-6">
        <h2 className="mb-6 text-lg font-bold text-gray-900 font-public-sans">Basic Information</h2>

        {images.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:mb-6 sm:grid-cols-2 sm:gap-6">
            {images.map((f) => <Field key={f.name} field={f} />)}
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {(() => {
            /* Fields marked `half` pair up into the template's two-column rows. */
            const rows: ResourceField[][] = [];
            let pendingHalf: ResourceField | null = null;
            for (const field of rest) {
              const isHalf = 'half' in field && field.half;
              if (isHalf) {
                if (pendingHalf) {
                  rows.push([pendingHalf, field]);
                  pendingHalf = null;
                } else {
                  pendingHalf = field;
                }
              } else {
                if (pendingHalf) {
                  rows.push([pendingHalf]);
                  pendingHalf = null;
                }
                rows.push([field]);
              }
            }
            if (pendingHalf) rows.push([pendingHalf]);
            return rows.map((row, i) => (
              <div key={i} className={row.length === 2 ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6' : ''}>
                {row.map((f) => <Field key={f.name} field={f} />)}
              </div>
            ));
          })()}
        </div>
      </div>

      {children && <div className="mb-4 sm:mb-6">{children}</div>}

      {error && <p className="mb-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error font-public-sans">{error}</p>}

      <div className="flex justify-end gap-3">
        <PillButton href={backHref} variant="secondary">Cancel</PillButton>
        {/* Hidden on a page the role can only view (e.g. Firebase settings). */}
        <span data-manage className="contents">
          <PillButton type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</PillButton>
        </span>
      </div>
    </form>
  );
}
