"use client";
import { useState } from "react";
import { Check, Tag, X } from "lucide-react";
import { validateCoupon, type CouponValidation } from "@/lib/orders-api";

export type AppliedCoupon = Extract<CouponValidation, { valid: true }>;

export default function CouponField({
  subtotal,
  applied,
  onApply,
  onRemove,
}: {
  subtotal: number;
  applied: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    if (!code.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const result = await validateCoupon(code.trim(), subtotal);
      if (result.valid) {
        onApply(result);
        setCode("");
      } else {
        setError(result.message);
      }
    } catch {
      setError("Could not check that code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-brand/25 bg-brand-50/50 px-3 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-brand-dark">
          <Check size={14} className="text-brand" />
          {applied.code}
          <span className="font-normal text-ink-muted">
            {applied.free_shipping ? "· free shipping" : `· −${applied.discount_amount}`}
          </span>
        </span>
        <button type="button" onClick={onRemove} aria-label="Remove promo code" className="grid h-7 w-7 place-items-center rounded text-ink-muted transition-colors hover:text-danger">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"><Tag size={14} /></span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleApply(); } }}
            placeholder="Promo code"
            className="w-full rounded-md border border-line/10 bg-surface-alt py-2.5 pl-8 pr-3 text-[13px] uppercase tracking-wide outline-none transition-colors focus:border-brand"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={busy || !code.trim()}
          className="rounded-md border border-line/15 px-4 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {busy ? "..." : "Apply"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  );
}
