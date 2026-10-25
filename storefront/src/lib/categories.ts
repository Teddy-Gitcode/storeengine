import type { Category } from "./types";

// Brand-neutral demo categories mirroring the backend `seed_demo_catalog`
// command. Fallback for when the API is unreachable — real categories come
// from the catalog API and are managed in the admin portal.
export const categories: Category[] = [
  { slug: "apparel",     name: "Apparel",       short: "Apparel",     dot: "A", tile: "bg-[#EAF3DE] text-[#3B6D11]" },
  { slug: "footwear",    name: "Footwear",      short: "Footwear",    dot: "F", tile: "bg-[#E1F5EE] text-[#0F6E56]" },
  { slug: "accessories", name: "Accessories",   short: "Accessories", dot: "C", tile: "bg-[#FAEEDA] text-[#854F0B]" },
  { slug: "home-living", name: "Home & Living", short: "Home",        dot: "H", tile: "bg-[#FAECE7] text-[#993C1D]" },
  { slug: "electronics", name: "Electronics",   short: "Tech",        dot: "E", tile: "bg-[#E6F1FB] text-[#0C447C]" },
  { slug: "beauty-care", name: "Beauty & Care", short: "Beauty",      dot: "B", tile: "bg-[#FBEAF0] text-[#72243E]" }
];

export function findCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
