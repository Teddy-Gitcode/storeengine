'use client';

import { useId, useState } from 'react';
import { X } from 'lucide-react';

export type PickerItem = { id: number; name: string };

/**
 * The template's "Select Tags" / "Add Product" combobox: a listbox to pick
 * from, choices shown as removable chips. Selections are posted as repeated
 * `name` fields (DRF reads a many-PK field from repeated keys), plus one marker
 * field so a cleared picker still *clears* the relation rather than reading as
 * "field absent, leave alone".
 */
export default function EntityPicker({
  items: tags,
  selectedIds = [],
  name,
  label,
  emptyLabel = 'All added',
  chooseLabel = 'Choose…',
}: {
  items: PickerItem[];
  selectedIds?: number[];
  name: string;
  label: string;
  emptyLabel?: string;
  chooseLabel?: string;
}) {
  const [selected, setSelected] = useState<number[]>(selectedIds);
  const id = useId();
  const available = tags.filter((t) => !selected.includes(t.id));
  const chosen = selected
    .map((sid) => tags.find((t) => t.id === sid))
    .filter((t): t is PickerItem => Boolean(t));

  return (
    <div className="space-y-3">
      {selected.map((sid) => (
        <input key={sid} type="hidden" name={name} value={sid} />
      ))}
      <input type="hidden" name={`${name}__present`} value="1" />

      <div className="relative">
        <select
          id={id}
          value=""
          onChange={(e) => {
            const picked = Number(e.target.value);
            if (picked) setSelected((list) => [...list, picked]);
          }}
          disabled={available.length === 0}
          className="h-14 w-full appearance-none rounded-full border border-gray-300 bg-transparent pl-3.5 pr-8 text-sm leading-5 text-light-primary-text focus:border-primary focus:outline-none disabled:opacity-60 font-public-sans"
        >
          <option value="">{available.length === 0 ? emptyLabel : chooseLabel}</option>
          {available.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <label
          htmlFor={id}
          className="pointer-events-none absolute -top-2 left-3.5 origin-left scale-75 bg-surface px-1 text-sm text-primary font-public-sans"
        >
          {label}
        </label>
      </div>

      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chosen.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-3 pr-1.5 text-xs font-semibold text-light-primary-text font-public-sans"
            >
              {t.name}
              <button
                type="button"
                onClick={() => setSelected((list) => list.filter((sid) => sid !== t.id))}
                className="flex size-5 items-center justify-center rounded-full text-light-secondary-text transition-colors hover:bg-gray-300 hover:text-error"
                aria-label={`Remove ${t.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
