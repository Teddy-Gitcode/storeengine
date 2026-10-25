import { money } from "./format";

/* What a pack size costs per gram, so two sizes of the same tea can be
 * compared without arithmetic.
 *
 * The measure is read out of the option's own label — "250g", "1kg",
 * "1.5 litres", "50 bags" — because that is where this catalogue keeps it; the
 * pricelist codes carry no quantity. An option that names no measure at all
 * ("Tagged", "Enveloped & tagged") has no unit price, and says so by returning
 * nothing rather than by inventing one.
 */

type Measure = { quantity: number; unit: "g" | "ml" | "bag" };

/** Scales per base unit, smallest first: the rate is quoted in the smallest
 *  one that does not round away to nothing. Tea is ~KSh 0.45/g, which reads;
 *  water at KSh 0.06/ml does not, and becomes KSh 58 per litre. */
const SCALES: Record<Measure["unit"], { per: number; label: string }[]> = {
  g: [
    { per: 1, label: "g" },
    { per: 100, label: "100 g" },
    { per: 1000, label: "kg" },
  ],
  ml: [
    { per: 1, label: "ml" },
    { per: 1000, label: "litre" },
  ],
  bag: [{ per: 1, label: "bag" }],
};

/** Below this, a rate has rounded to two decimals that say nothing. */
const LEGIBLE = 0.1;

// Longest spellings first: "ml" must beat "m", and "litres" must beat "l", or
// "1.5 litres" reads as 1.5ml.
const PATTERNS: { re: RegExp; unit: Measure["unit"]; per: number }[] = [
  { re: /(\d+(?:\.\d+)?)\s*(?:kgs?|kilograms?)\b/i, unit: "g", per: 1000 },
  { re: /(\d+(?:\.\d+)?)\s*(?:grams?|gms?|g)\b/i, unit: "g", per: 1 },
  { re: /(\d+(?:\.\d+)?)\s*(?:ml|millilitres?|milliliters?)\b/i, unit: "ml", per: 1 },
  { re: /(\d+(?:\.\d+)?)\s*(?:litres?|liters?|ltrs?|lt|l)\b/i, unit: "ml", per: 1000 },
  { re: /(\d+(?:\.\d+)?)\s*(?:bags?|sachets?|satchets?|packets?|pcs?)\b/i, unit: "bag", per: 1 },
  // Ketepa's own shorthand for a box count: "Handy Tea Bags – 25's". Last, so
  // a label that spells its unit out is never read this way.
  { re: /(\d+)\s*['’]s\b/, unit: "bag", per: 1 },
];

export function parseMeasure(label: string): Measure | undefined {
  for (const { re, unit, per } of PATTERNS) {
    const found = re.exec(label);
    if (!found) continue;
    const quantity = Number(found[1]) * per;
    if (quantity > 0) return { quantity, unit };
  }
  return undefined;
}

/** What one unit costs, and which unit that is — 0.456 and "g" for a 250g pack
 *  at KSh 114. Nothing when nothing on offer names a measurable quantity.
 *
 *  Candidates are tried in order of how specific they are — the chosen option
 *  first, then the product's own title, which is where the tea bags keep their
 *  count ("Handy Tea Bags – 25's" sold as Untagged / Tagged). */
export function unitRate(price: number, ...candidates: string[]): Rate | undefined {
  const measure = candidates.map(parseMeasure).find(Boolean);
  if (!measure || price <= 0) return undefined;

  const scales = SCALES[measure.unit];
  const scale =
    scales.find((s) => (price / measure.quantity) * s.per >= LEGIBLE) ?? scales[scales.length - 1];
  return { amount: (price / measure.quantity) * scale.per, unit: scale.label };
}

export type Rate = { amount: number; unit: string };

/** "KSh 0.46 per g", for somewhere with room to spell it out. A grid card uses
 *  `unitRate` and writes the shelf-edge form, "KSh 0.46/g". */
export function unitPrice(price: number, ...candidates: string[]): string | undefined {
  const rate = unitRate(price, ...candidates);
  return rate && `${money(rate.amount)} per ${rate.unit}`;
}
