"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

/* The category dropdown used to read the static demo list, so it offered
   Apparel/Footwear/Electronics no matter what the merchant actually sells —
   and searching one of them returned nothing. The Header already fetches the
   real categories for the nav, so it passes them straight through.

   No demo fallback: a store with no categories, or one whose API is briefly
   down, gets "All categories" on its own. Filtering a real catalogue by
   Footwear returns an empty page, which is worse than not offering it. */

export default function SearchBar({ categories }: { categories?: { slug: string; name: string }[] }) {
  const options = categories ?? [];
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat !== "all") params.set("category", cat);
    router.push(`/shop?${params.toString()}`);
  }

  return (
    // Shoppe's search: a grey pill, the brand only as the round button at its end.
    <form onSubmit={onSubmit} className="flex-1 flex items-center bg-surface-alt border border-transparent rounded-full overflow-hidden pr-1 focus-within:border-brand focus-within:bg-surface transition-colors">
      {options.length > 0 && (
        <>
          <label className="sr-only" htmlFor="cat-select">Category</label>
          <select
            id="cat-select"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="bg-transparent border-r border-line/15 text-[13px] font-semibold text-ink pl-5 pr-3 outline-none cursor-pointer min-w-[140px] max-w-[180px] hidden md:block"
          >
            <option value="all">All categories</option>
            {options.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </>
      )}
      <label className="sr-only" htmlFor="q-input">Search</label>
      <input
        id="q-input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products…"
        className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none min-w-0"
      />
      {/* Icon-only below sm. The word costs ~60px of a 390px screen, which is
          the difference between a usable search field and a cramped one. */}
      <button
        type="submit"
        aria-label="Search"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-on-brand transition hover:bg-brand-dark"
      >
        <Search size={17} strokeWidth={2.2} />
      </button>
    </form>
  );
}
