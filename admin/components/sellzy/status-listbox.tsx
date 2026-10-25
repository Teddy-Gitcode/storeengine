'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type StatusOption = { value: string; label: string };

/**
 * The template's header status control (Publish / Draft, Active / Inactive).
 *
 * It is a button plus its own panel, not a styled `<select>`: a native select
 * cannot centre its label inside a 30px pill, and its popup is drawn by the
 * browser, so it never matched the rest of the page. The chosen value rides
 * along in a hidden input, so plain `<form action={…}>` posts still work.
 */
export default function StatusListbox({
  name,
  defaultValue,
  options,
  activeValue,
}: {
  name: string;
  defaultValue: string;
  options: StatusOption[];
  /** The value that gets the green "live" treatment. */
  activeValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const live = value === activeValue;
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative z-20 w-32" ref={rootRef}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`relative flex h-7.5 w-full cursor-pointer items-center justify-between rounded-full border px-4 py-0 text-left text-[13px] font-bold transition-colors focus:outline-none font-public-sans ${
          live
            ? 'border-primary bg-[rgba(0,171,85,0.08)] text-primary-dark'
            : 'border-gray-400 bg-gray-100 text-light-secondary-text'
        }`}
      >
        <span className="mr-1.5 block truncate font-bold">{selected?.label}</span>
        <ChevronDown
          size={20}
          className={`pointer-events-none shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 w-full overflow-hidden rounded-xl bg-surface py-1 shadow-lg ring-1 ring-gray-500/20"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { setValue(option.value); setOpen(false); }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-gray-100 font-public-sans ${
                    isSelected ? 'text-primary-dark' : 'text-light-secondary-text'
                  }`}
                >
                  {option.label}
                  {isSelected && <Check size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
