'use client';

import { useState } from 'react';

/** Sellzy pill toggle switch. Wraps a real `<input type=checkbox>` so it
 * still posts `name` through a plain `<form action={...}>` server action —
 * only the track/thumb are custom-drawn to match the template's switches. */
export default function SettingsToggle({
  name, defaultChecked = false, disabled = false, label,
}: {
  name?: string; defaultChecked?: boolean; disabled?: boolean;
  /** What the switch is for — the control draws no text of its own, so
   *  without this a screen reader announces an unnamed checkbox. */
  label?: string;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <label
      className="relative inline-flex items-center shrink-0"
      style={{ width: 34, height: 20, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      <input
        type="checkbox"
        name={name}
        checked={on}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => setOn(e.target.checked)}
        className="sr-only"
      />
      <span
        className="absolute inset-0 rounded-full transition-colors"
        style={{ background: on ? 'var(--brand)' : 'var(--border-2)' }}
      />
      <span
        className="absolute rounded-full bg-white shadow transition-transform"
        style={{ width: 16, height: 16, top: 2, left: 2, transform: on ? 'translateX(14px)' : 'translateX(0)' }}
      />
    </label>
  );
}
