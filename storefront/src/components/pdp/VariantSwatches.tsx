"use client";
import StoreImage from "@/components/ui/StoreImage";
import { money } from "@/lib/format";
import { useSelection } from "./selection";

/* The variation strip: one tile per buyable option, its own price underneath.
 *
 * Tiles rather than a dropdown because the price differs per option and a
 * <select> can only ever show one of them — the question "what do the other
 * colours cost" is asked before the question "which one do I want". Options
 * that carry no image of their own fall back to a labelled chip, which is the
 * honest rendering for a size.
 *
 * Sold-out options stay visible and unclickable: knowing the shop sells it, and
 * that this one is gone, is worth more than a shorter strip. */
export default function VariantSwatches() {
  const { product, variants, variantId, setVariantId, variant } = useSelection();
  if (variants.length === 0) return null;

  const withImages = variants.some((v) => v.imageUrl);
  // The catalogue's own word when it has one ("Size", "Flavour"). Otherwise
  // "Colour" when every option names one and nothing else varies, else the
  // neutral word, because "Colour: 100ml" is nonsense.
  // Capitalised here: the importer stores the catalogue's word as it found
  // it ("colour"), and it heads a line.
  const raw =
    product.variantOption ||
    (variants.every((v) => v.color) && !variants.some((v) => v.size) ? "Colour" : "Options");
  const dimension = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <div className="mt-5">
      <p className="font-display text-[15px] font-bold text-ink">
        {dimension}:{" "}
        <span className="font-sans font-semibold text-ink-muted">{variant?.label ?? "Select one"}</span>
      </p>

      <div className={`mt-2 flex flex-wrap ${withImages ? "gap-2.5" : "gap-2"}`}>
        {variants.map((v) => {
          const soldOut = v.stockQty <= 0 && !product.allowBackorder;
          const selected = v.id === variantId;
          const border = selected ? "border-brand" : "border-surface hover:border-brand/50";

          if (!withImages) {
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariantId(v.id)}
                disabled={soldOut}
                aria-pressed={selected}
                title={soldOut ? `${v.label} — sold out` : v.label}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                  selected ? "bg-brand text-on-brand" : "bg-blob text-ink hover:bg-brand/20"
                } ${soldOut ? "cursor-not-allowed text-ink-faint line-through opacity-60" : ""}`}
              >
                {v.label}
              </button>
            );
          }

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariantId(v.id)}
              disabled={soldOut}
              aria-pressed={selected}
              title={soldOut ? `${v.label} — sold out` : v.label}
              className={`w-[76px] overflow-hidden rounded-xl border-[3px] bg-surface text-center shadow-photo transition-colors ${border} ${
                soldOut ? "cursor-not-allowed opacity-45" : ""
              }`}
            >
              <span className="relative block aspect-square overflow-hidden rounded-[9px]">
                {v.imageUrl ? (
                  <StoreImage src={v.imageUrl} alt="" fill sizes="74px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center px-1 text-[11px] leading-tight text-ink-muted">
                    {v.label}
                  </span>
                )}
              </span>
              <span className={`block py-1 text-[11px] font-bold tabular-nums ${selected ? "text-brand" : "text-ink-muted"}`}>
                {soldOut ? "Sold out" : money(v.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
