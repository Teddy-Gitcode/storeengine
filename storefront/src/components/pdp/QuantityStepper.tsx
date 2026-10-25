"use client";

/* − [n] + — the same control the cart uses, so a shopper adjusts a quantity
   the same way on both pages. Replaces a 1–24 dropdown, which took two taps to
   go from 1 to 2 and hid how many were left behind a list. */
export default function QuantityStepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  /** Highest quantity allowed; undefined means no limit. */
  max?: number;
}) {
  const atMax = max !== undefined && value >= max;

  return (
    <div className="inline-flex h-11 items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className="grid h-8 w-8 place-items-center rounded-full border-2 border-line/30 text-[17px] leading-none text-ink-muted hover:border-ink hover:text-ink disabled:text-ink-faint disabled:hover:border-line/30 disabled:hover:text-ink-faint"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="min-w-10 rounded-md border border-line/30 bg-surface px-2 py-1.5 text-center text-[14px] font-semibold tabular-nums text-ink" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(atMax ? value : value + 1)}
        disabled={atMax}
        className="grid h-8 w-8 place-items-center rounded-full border-2 border-line/30 text-[17px] leading-none text-ink-muted hover:border-ink hover:text-ink disabled:text-ink-faint disabled:hover:border-line/30 disabled:hover:text-ink-faint"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
