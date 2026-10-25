'use client';

// Shared Sellzy-template primitives for the Products domain (list, detail/edit,
// reviews, categories, inventory). Pure presentation — no data fetching here.

import { useId } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import FilterListbox from '@/components/sellzy/filter-listbox';

/* ─── Status pill (template's "Publish"/"Draft" tag) ────────────────────────── */

export type PillTone = 'primary' | 'warning' | 'error' | 'info' | 'success' | 'neutral';

const TONE_CLS: Record<PillTone, string> = {
  primary: 'bg-primary/16 text-primary-dark',
  success: 'bg-success/16 text-success-dark',
  warning: 'bg-warning/16 text-warning-dark',
  error: 'bg-error/16 text-error-dark',
  info: 'bg-info/16 text-info-dark',
  neutral: 'bg-gray-200 text-light-secondary-text',
};

export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <span
      className={`px-2.5 py-0.5 h-5.5 inline-flex items-center justify-center font-public-sans rounded-full text-xs font-semibold whitespace-nowrap ${TONE_CLS[tone]}`}
    >
      {label}
    </span>
  );
}

/* ─── Icon action buttons (eye / pencil / trash row actions) ─────────────────── */

const ICON_BTN_BASE =
  'inline-flex items-center justify-center cursor-pointer font-bold transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 border-none shadow-none bg-transparent h-8 w-8 p-0 text-light-primary-text';

export function IconAction({
  href,
  external,
  onClick,
  type = 'button',
  title,
  danger,
  children,
}: {
  href?: string;
  external?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  title?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const cls = `${ICON_BTN_BASE} ${danger ? 'hover:text-error' : 'hover:text-primary'}`;
  if (href && external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} title={title}>
        {children}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={cls} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls} title={title}>
      {children}
    </button>
  );
}

/* ─── Pill buttons (Create Product / Cancel / Save …) ───────────────────────── */

const PILL_BASE =
  'rounded-full inline-flex items-center justify-center gap-1.5 cursor-pointer font-bold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 px-4 py-1 h-9 text-sm leading-6 whitespace-nowrap';
const PILL_VARIANT = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'border border-gray-300 text-light-secondary-text hover:bg-gray-50',
  outlinePrimary: 'border border-primary bg-primary/8 text-primary hover:bg-primary/16',
};

export function PillButton({
  href,
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
  className = '',
  children,
}: {
  href?: string;
  variant?: keyof typeof PILL_VARIANT;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = `${PILL_BASE} ${PILL_VARIANT[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* ─── Search box (pill input with leading icon) ─────────────────────────────── */

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search…',
  name,
  defaultValue,
  className = '',
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={`relative sm:w-[300px] w-full ${className}`}>
      <Search size={14} className="absolute text-light-primary-text left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        value={onChange ? value : undefined}
        defaultValue={onChange ? undefined : defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="pl-9 w-full pr-3.5 ring h-9 ring-gray-500/20 py-2 bg-gray-100 border-none rounded-full text-sm focus:outline-none focus:ring-primary transition-all font-normal text-light-primary-text placeholder:text-light-secondary-text font-public-sans"
      />
    </div>
  );
}

/* ─── Filter dropdown (native select, styled like the template's pill listbox) ─ */

export function FilterPill({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`min-w-[140px] ${className}`}>
      <FilterListbox value={value} onChange={onChange} options={options} />
    </div>
  );
}
/* ─── Table shell class strings (reused across list-style tables) ───────────── */

export const TABLE_HEAD_ROW =
  'transition-colors bg-gray-100 hover:bg-gray-100 border-y border-gray-500/20';
export const TABLE_TH =
  'h-12 p-3 first:pl-6 whitespace-nowrap last:pr-6 text-left align-middle text-light-primary-text text-sm font-semibold font-public-sans';
export const TABLE_ROW = 'border-b last:border-0 border-gray-500/20 hover:bg-gray-50/50 transition-colors';
export const TABLE_TD = 'px-3 py-3.5 first:pl-6 last:pr-6 align-middle font-public-sans';

/* ─── Pagination (template's circular page-number pills) ────────────────────── */

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, Math.min(page - 2, totalPages - 3)),
    Math.max(0, Math.min(page - 2, totalPages - 3)) + 3,
  );
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="w-10 h-7.5 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex items-center gap-1">
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-10 h-7.5 flex items-center justify-center rounded-full text-sm transition-colors font-public-sans ${
              p === page ? 'bg-primary-lighter text-primary-dark font-semibold' : 'text-gray-600 hover:bg-gray-50 font-medium'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="w-10 h-7.5 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ─── Floating-label form fields (template's pill inputs on add/edit forms) ──── */

export function FloatingInput({
  label,
  name,
  defaultValue,
  value,
  onChange,
  type = 'text',
  required,
  step,
  min,
  className = '',
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  /* Pass value + onChange to drive the field from parent state (e.g. name → slug). */
  value?: string;
  onChange?: (v: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        name={name}
        type={type}
        step={step}
        min={min}
        defaultValue={onChange ? undefined : defaultValue}
        value={onChange ? value : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        required={required}
        placeholder=" "
        className="block px-3.5 py-4 w-full h-14 text-sm text-light-primary-text bg-transparent rounded-full border border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer font-public-sans"
      />
      <label
        htmlFor={id}
        className="absolute text-sm text-primary duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-left left-3.5 bg-surface peer-placeholder-shown:bg-transparent peer-focus:bg-surface px-1 peer-focus:px-1 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:text-light-disabled-text peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 cursor-text font-public-sans"
      >
        {label}
      </label>
    </div>
  );
}

export function FloatingTextarea({
  label,
  name,
  defaultValue,
  value,
  onChange,
  rows = 4,
  className = '',
}: {
  label: string;
  name: string;
  defaultValue?: string;
  /* Pass value + onChange to drive the field from parent state, as with
     FloatingInput and FloatingSelect. */
  value?: string;
  onChange?: (v: string) => void;
  rows?: number;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`relative ${className}`}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={onChange ? undefined : defaultValue}
        value={onChange ? value : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder=" "
        className="block px-3.5 py-4 w-full text-sm text-light-primary-text bg-transparent rounded-2xl border border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer resize-none font-public-sans"
      />
      <label
        htmlFor={id}
        className="absolute text-sm text-primary duration-300 transform -translate-y-4 scale-75 top-2 z-10 left-3.5 origin-left bg-surface peer-placeholder-shown:bg-transparent peer-focus:bg-surface px-1 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:text-light-disabled-text peer-placeholder-shown:translate-y-3 peer-placeholder-shown:top-1 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 cursor-text font-public-sans"
      >
        {label}
      </label>
    </div>
  );
}

export function FloatingSelect({
  label,
  name,
  defaultValue,
  value,
  onChange,
  required,
  options,
  className = '',
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  /* Pass value + onChange to drive the field from parent state. */
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  options: { value: string | number; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`relative ${className}`}>
      <select
        id={id}
        name={name}
        defaultValue={onChange ? undefined : defaultValue}
        value={onChange ? value : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        required={required}
        className="w-full h-14 pl-3.5 pr-8 text-sm leading-5 text-light-primary-text focus:outline-none bg-transparent rounded-full border border-gray-300 focus:border-primary appearance-none font-public-sans"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label
        htmlFor={id}
        className="absolute start-1 bg-surface px-1 origin-left text-sm left-3.5 -top-2 scale-75 text-primary pointer-events-none font-public-sans"
      >
        {label}
      </label>
    </div>
  );
}

/* ─── Toggle switch (template's Discount on/off switch) ─────────────────────── */

export function ToggleSwitch({
  checked,
  onChange,
  label,
  labelledBy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  /** id of the element naming this switch — the trailing `label` only
   *  describes the current state, so on its own it is not a name. */
  labelledBy?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-3.5 w-8.5 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer ${checked ? 'bg-primary' : 'bg-gray-500'}`}
      >
        <span
          className={`bg-white inline-block h-5 w-5 transform rounded-full shadow transition-all duration-200 ease-in-out ${checked ? 'translate-x-3.5' : '-translate-x-0.5'}`}
        />
      </button>
      {label && <span className="text-xs text-light-secondary-text font-public-sans">{label}</span>}
    </div>
  );
}

/* ─── Card section wrapper (bordered rounded-2xl block with a header row) ───── */

export function SectionCard({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-2xl border-gray-500/20 bg-surface">
      {title && (
        <div className="flex items-center justify-between border-b border-gray-500/20 py-4 px-4 sm:px-6">
          <h2 className="text-lg font-bold text-light-primary-text font-public-sans">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
