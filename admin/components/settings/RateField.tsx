'use client';

import { useState } from 'react';

/* The exchange rate, the way a merchant says it: "1 USD = 129.81 KSh".
 *
 * The backend stores the multiplier from the base currency to the second one
 * (base × rate = second), which for a shilling store is 0.0077035667… — a
 * number nobody reads off a bank's board. So the field takes the figure people
 * quote and posts its inverse, to ten places so 129.81 comes back as 129.81. */
export default function RateField({
  defaultRate,
  baseCode,
  secondCode,
}: {
  /** base × rate = second, as stored. */
  defaultRate: string | number | null | undefined;
  baseCode: string;
  secondCode: string;
}) {
  const stored = Number(defaultRate ?? 0);
  const [quoted, setQuoted] = useState(
    stored > 0 ? String(Number((1 / stored).toFixed(4))) : '',
  );
  const value = Number(quoted);
  const rate = Number.isFinite(value) && value > 0 ? (1 / value).toFixed(10) : '0';
  const second = secondCode || 'second currency';
  const base = baseCode || 'base';

  return (
    <label className="flex flex-col gap-1.5">
      <span className="ak-field-label">Rate</span>
      <span className="flex items-center gap-2">
        <span className="shrink-0 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>1 {second} =</span>
        <input
          type="number"
          step="any"
          min="0"
          value={quoted}
          onChange={(e) => setQuoted(e.target.value)}
          placeholder="129.81"
          className="ak-input"
          style={{ borderRadius: 9999 }}
          aria-label={`How many ${base} make 1 ${second}`}
        />
        <span className="shrink-0 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{base}</span>
      </span>
      <input type="hidden" name="secondary_currency_rate" value={rate} />
      <span className="ak-help">
        What one {second} costs in {base}. Blank or zero switches the second currency off.
      </span>
    </label>
  );
}
