'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';

/* Grid or table, remembered per list.
 *
 * Every list in this admin was a table, including the ones whose rows are
 * mostly a picture — a category icon, a brand logo, a promo banner — shown at
 * 32px in the first column. The toggle is one component so the control looks
 * and behaves the same on all of them, and so a list added later gets it for
 * free rather than inventing a third way.
 *
 * The preference is per list, not global: somebody may well want cards for
 * banners and rows for tax rates, and making one choice govern both would make
 * the control useless for whichever they cared about less.
 */

export type View = 'grid' | 'table';

export function useViewPreference(key: string, fallback: View): [View, (next: View) => void] {
  const [view, setView] = useState<View>(fallback);

  // Read after mount, not during render: the server has no localStorage, and
  // reading it in a first render would make the markup disagree with itself.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`view:${key}`);
      if (saved === 'grid' || saved === 'table') setView(saved);
    } catch {
      /* private window, or site data blocked — the fallback stands */
    }
  }, [key]);

  const choose = useCallback(
    (next: View) => {
      setView(next);
      try {
        localStorage.setItem(`view:${key}`, next);
      } catch {
        /* the choice just does not outlive the tab */
      }
    },
    [key],
  );

  return [view, choose];
}

export default function ViewToggle({
  view,
  onChange,
  label = 'How this list is shown',
}: {
  view: View;
  onChange: (next: View) => void;
  label?: string;
}) {
  const options: { key: View; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'grid', label: 'Grid', icon: LayoutGrid },
    { key: 'table', label: 'Table', icon: List },
  ];

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 overflow-hidden rounded-full"
      style={{ border: '1px solid var(--border-2)' }}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.key === view;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={active}
            title={`${option.label} view`}
            className="inline-flex h-8 items-center gap-1.5 px-3 text-[12.5px] font-semibold transition-colors"
            style={{
              background: active ? 'var(--brand)' : 'transparent',
              color: active ? '#fff' : 'var(--text-3)',
            }}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
