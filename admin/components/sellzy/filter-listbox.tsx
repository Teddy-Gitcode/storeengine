'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type FilterOption = { value: string; label: string };

/**
 * The template's rounded filter control.
 *
 * It was a native `<select>` wearing the template's pill classes. Closed, that
 * passed; open, the browser drew the popup — square corners, the OS highlight
 * colour, system metrics — because a native select's dropdown cannot be styled.
 * The template is a Headless UI Listbox: a button plus a panel that is ordinary
 * markup, which is why its menu is rounded, shadowed and teal-on-hover.
 *
 * Hand-rolled rather than adding @headlessui/react for one control, and shaped
 * after `status-listbox.tsx`, which already does this for the publish pill.
 * Classes below are the template's, verbatim.
 */
export default function FilterListbox({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  /* Which option the keyboard is on. Kept apart from the selected value so
     arrowing through the list does not apply anything until Enter. */
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  // The placeholder row carries value '' — showing it is not "a choice made".
  const hasValue = Boolean(value) && Boolean(selected);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Keep the highlighted row in view when arrowing past the panel's max height.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  function openWith(index: number) {
    setActiveIndex(index);
    setOpen(true);
  }

  function pick(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        openWith(selectedIndex >= 0 ? selectedIndex : 0);
      }
      return;
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        pick(activeIndex);
        break;
    }
  }

  return (
    <div className={`relative w-full ${className}`} ref={rootRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={open && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openWith(selectedIndex >= 0 ? selectedIndex : 0))}
        onKeyDown={onKeyDown}
        className={`relative h-9 ring inline-flex text-sm items-center justify-between ring-[rgba(145,158,171,0.20)] w-full cursor-pointer rounded-full bg-gray-200 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary font-public-sans ${buttonClassName}`}
      >
        <span className={`block truncate ${hasValue ? 'text-light-primary-text' : 'text-light-secondary-text'}`}>
          {hasValue ? selected?.label : (options[0]?.value === '' ? options[0].label : placeholder)}
        </span>
        <span className="pointer-events-none flex items-center pl-2">
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute focus:outline-none mt-1 max-h-60 min-w-full overflow-auto rounded-lg bg-surface p-2 border border-gray-500/20 z-50 shadow-light-z-24"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            const isActive = i === activeIndex;
            return (
              <li
                key={option.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => pick(i)}
                className={`relative cursor-pointer text-sm rounded-lg select-none px-3 py-1.5 font-public-sans ${
                  isActive ? 'bg-gray-100 text-light-primary-text' : 'text-light-secondary-text'
                } ${isSelected ? 'font-medium' : 'font-normal'}`}
              >
                <span className="block text-sm truncate">{option.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
