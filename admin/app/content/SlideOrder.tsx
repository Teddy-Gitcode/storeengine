'use client';

import { useState } from 'react';
import { GripVertical, Save, Check } from 'lucide-react';

type SlideLite = {
  id: number;
  title: string;
  eyebrow: string;
  status: string;
  status_label: string;
};

function statusDot(status: string) {
  if (status === 'live') return 'bg-primary';
  if (status === 'paused') return 'bg-gray-400';
  if (status === 'scheduled') return 'bg-secondary';
  return 'bg-warning';
}

/**
 * Drag-to-reorder panel for hero slides. Order is persisted to sort_order,
 * which drives the sequence shoppers see on the storefront hero.
 */
export default function SlideOrder({
  slides,
  action,
}: {
  slides: SlideLite[];
  action: (orderedIds: number[]) => Promise<void>;
}) {
  const [order, setOrder] = useState<SlideLite[]>(slides);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = order.some((s, i) => s.id !== slides[i]?.id);

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await action(order.map((s) => s.id));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ak-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Slide order</h3>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Drag to reorder. This is the sequence shoppers see on the storefront hero.
          </p>
        </div>
        <button
          type="button"
          className="ak-btn-primary"
          onClick={save}
          disabled={!dirty || saving}
          style={!dirty || saving ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          {saved ? <Check size={13} /> : <Save size={13} />}
          {saved ? 'Saved' : saving ? 'Saving…' : 'Save order'}
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {order.map((slide, index) => (
          <li
            key={slide.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(index)}
            onDragEnd={() => setDragIndex(null)}
            className="flex items-center gap-3 rounded-md border bg-surface px-3 py-2"
            style={{
              borderColor: dragIndex === index ? 'var(--brand)' : 'var(--border)',
              opacity: dragIndex === index ? 0.6 : 1,
              cursor: 'grab',
            }}
          >
            <GripVertical size={15} style={{ color: 'var(--text-3)' }} />
            <span className="tabular-nums text-xs font-semibold w-5" style={{ color: 'var(--text-3)' }}>{index + 1}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusDot(slide.status) }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{slide.title || 'Untitled slide'}</p>
              {slide.eyebrow && <p className="text-[10px] uppercase tracking-wide truncate" style={{ color: 'var(--text-3)' }}>{slide.eyebrow}</p>}
            </div>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{slide.status_label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
