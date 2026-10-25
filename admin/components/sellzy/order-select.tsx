'use client';

import { useRef } from 'react';
import FilterListbox from '@/components/sellzy/filter-listbox';

/**
 * Pill filter for the server-rendered order/refund toolbars, which read their
 * state from the query string and so have to submit a real form.
 *
 * It was a native `<select>` in the template's pill classes; the template is a
 * listbox, and a native select's popup cannot be styled to match (see
 * `filter-listbox.tsx`). The chosen value rides in a hidden input so the plain
 * GET form still works, and picking one submits it — same behaviour as before.
 */
export default function OrderSelect({
  name,
  defaultValue,
  options,
  className = '',
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`min-w-[110px] ${className}`}>
      <input ref={inputRef} type="hidden" name={name} defaultValue={defaultValue} />
      <FilterListbox
        value={defaultValue}
        options={options}
        onChange={(v) => {
          const input = inputRef.current;
          if (!input) return;
          input.value = v;
          input.form?.requestSubmit();
        }}
      />
    </div>
  );
}
