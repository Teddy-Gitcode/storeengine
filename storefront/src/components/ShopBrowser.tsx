"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { getProductsPage, type ProductQuery } from "@/lib/catalog-api";
import { categories as demoCategories } from "@/lib/categories";
import { money } from "@/lib/format";
import ProductGrid from "./ProductGrid";
import Stars from "@/components/Stars";

type Sort = "popular" | "price-asc" | "price-desc" | "newest";

/* Round to a readable boundary — 1, 2 or 5 times a power of ten — so cuts read
   as "KSh 250" rather than "KSh 237.5". */
function niceRound(value: number) {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => value <= s * magnitude)! * magnitude;
  return Math.round(value / (step / 5)) * (step / 5);
}

/* Price bands derived from the catalogue rather than hardcoded.

   These used to be fixed at 25/50/100. The currency symbol was already
   store-driven, so they *looked* localised — but the magnitudes were the
   template's, and on a catalogue spanning KSh 4 to KSh 5,250 "Over KSh 100"
   swallowed almost everything and the other three bands were nearly empty.
   A filter that cannot split the catalogue is decoration.

   Quartiles put roughly a quarter of the products in each band whatever the
   store sells, which is what makes the control worth having. Filtering runs
   client-side over the loaded products, so deriving the bands from that same
   set keeps the two consistent. */
function buildPriceBands(prices: number[]) {
  const any = { id: "any", label: "Any price", min: 0, max: Infinity };
  const sorted = prices.filter((p) => p > 0).sort((a, b) => a - b);
  if (sorted.length < 4) return [any];

  const at = (p: number) => sorted[Math.floor((sorted.length - 1) * p)];
  const cuts = [...new Set([at(0.25), at(0.5), at(0.75)].map(niceRound))]
    .filter((c) => c > sorted[0] && c < sorted[sorted.length - 1]);
  if (!cuts.length) return [any];

  const bands = [any, { id: `under-${cuts[0]}`, label: `Under ${money(cuts[0])}`, min: 0, max: cuts[0] }];
  for (let i = 0; i < cuts.length - 1; i++) {
    bands.push({
      id: `${cuts[i]}-${cuts[i + 1]}`,
      label: `${money(cuts[i])}–${money(cuts[i + 1])}`,
      min: cuts[i],
      max: cuts[i + 1]
    });
  }
  const last = cuts[cuts.length - 1];
  bands.push({ id: `over-${last}`, label: `Over ${money(last)}`, min: last, max: Infinity });
  return bands;
}

export default function ShopBrowser({
  products,
  title,
  initialTag,
  initialQuery,
  initialCategory,
  showCategoryFilter = true,
  hasMore: initialHasMore = false,
  total,
  query,
  categories: realCategories
}: {
  products: Product[];
  title: string;
  initialTag?: string;
  initialQuery?: string;
  initialCategory?: string;
  showCategoryFilter?: boolean;
  /** Whether the API has further pages beyond the ones passed in. */
  hasMore?: boolean;
  /** Total matches across every page, for an honest count in the header. */
  total?: number;
  /** The server-side query this list came from, replayed for later pages. */
  query?: ProductQuery;
  /** The store's real categories. Omitted only by callers that have none.
      `short` is a demo-list nicety the API has no equivalent for, so the
      mobile chips fall back to the full name. */
  categories?: { slug: string; name: string; short?: string }[];
}) {
  // The filter list, the active-filter chip and the mobile row all read this.
  // It used to be the static demo import, so the sidebar offered Apparel and
  // Electronics whatever the merchant sold — and selecting one filtered the
  // list to nothing, since no product carried that category.
  const categories = realCategories?.length ? realCategories : demoCategories;
  // Pages fetched after the first are appended here. The server-rendered page
  // stays the source of truth for page 1, so a soft navigation back to /shop
  // with different search params resets cleanly.
  const [extra, setExtra] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setExtra([]);
    setHasMore(initialHasMore);
    setPage(1);
    setLoadError(false);
  }, [products, initialHasMore]);

  const loaded = useMemo(() => [...products, ...extra], [products, extra]);

  async function loadMore() {
    setLoadingMore(true);
    setLoadError(false);
    try {
      const next = await getProductsPage({ ...query, page: page + 1 });
      setExtra((current) => [...current, ...next.products]);
      setHasMore(next.hasMore);
      setPage((p) => p + 1);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const [sort, setSort] = useState<Sort>("popular");
  const [bandId, setBandId] = useState<string>("any");
  const [tag, setTag] = useState<string>(initialTag ?? "");
  const [q, setQ] = useState<string>(initialQuery ?? "");
  const [cat, setCat] = useState<string>(initialCategory ?? "all");
  const [minRating, setMinRating] = useState<number>(0);

  const priceBands = useMemo(() => buildPriceBands(loaded.map((p) => p.price)), [loaded]);
  // A rating filter over a catalogue nobody has reviewed can only ever empty
  // the grid, so it is offered once there is something to filter by.
  const hasRatings = useMemo(() => loaded.some((p) => (p.reviewCount ?? 0) > 0), [loaded]);
  // "Load more" can change the bands under a selection, so fall back to "any"
  // rather than crashing on a band id that no longer exists.
  const band = priceBands.find((b) => b.id === bandId) ?? priceBands[0];

  const filtered = useMemo(() => {
    let list = loaded.filter((p) => p.price >= band.min && p.price <= band.max);
    if (cat !== "all" && showCategoryFilter) list = list.filter((p) => p.category === cat);
    if (tag) list = list.filter((p) => (p.tags || []).includes(tag));
    if (minRating > 0) list = list.filter((p) => p.rating >= minRating);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(needle))
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
      case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
      case "newest": sorted.sort((a, b) => Number(b.id) - Number(a.id)); break;
      default: sorted.sort((a, b) => b.sold - a.sold);
    }
    return sorted;
  }, [loaded, sort, band, tag, q, cat, minRating, showCategoryFilter]);

  const activeFilters = [
    cat !== "all" && showCategoryFilter ? { key: "cat", label: categories.find(c => c.slug === cat)?.name || cat, clear: () => setCat("all") } : null,
    bandId !== "any" ? { key: "band", label: band.label, clear: () => setBandId("any") } : null,
    tag ? { key: "tag", label: `#${tag}`, clear: () => setTag("") } : null,
    q ? { key: "q", label: `"${q}"`, clear: () => setQ("") } : null,
    minRating > 0 ? { key: "rating", label: `${minRating} stars & up`, clear: () => setMinRating(0) } : null
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:block">
        <div className="bg-surface-alt rounded-2xl p-5 sticky top-36">
          <FilterSection title="Categories">
            <ul className="flex flex-col gap-1.5 text-sm">
              {showCategoryFilter && (
                <li>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-brand">
                    <input
                      type="radio"
                      name="cat"
                      checked={cat === "all"}
                      onChange={() => setCat("all")}
                      className="accent-brand"
                    />
                    All categories
                  </label>
                </li>
              )}
              {showCategoryFilter && categories.map((c) => (
                <li key={c.slug}>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-brand">
                    <input
                      type="radio"
                      name="cat"
                      checked={cat === c.slug}
                      onChange={() => setCat(c.slug)}
                      className="accent-brand"
                    />
                    {c.name}
                  </label>
                </li>
              ))}
              {!showCategoryFilter && (
                <li className="text-ink-muted text-xs">Browse other categories via the top nav</li>
              )}
            </ul>
          </FilterSection>

          <FilterSection title="Price">
            <ul className="flex flex-col gap-1.5 text-sm">
              {priceBands.map((b) => (
                <li key={b.id}>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-brand">
                    <input
                      type="radio"
                      name="band"
                      checked={bandId === b.id}
                      onChange={() => setBandId(b.id)}
                      className="accent-brand"
                    />
                    {b.label}
                  </label>
                </li>
              ))}
            </ul>
          </FilterSection>

          {hasRatings && (
          <FilterSection title="Rating">
            <ul className="flex flex-col gap-1.5 text-sm">
              {[0, 4, 4.5].map((r) => (
                <li key={r}>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-brand">
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === r}
                      onChange={() => setMinRating(r)}
                      className="accent-brand"
                    />
                    {r === 0 ? "Any rating" : (
                      <span className="flex items-center gap-1.5">
                        <Stars value={r} size={13} />
                        <span className="text-ink-muted text-xs">&amp; up</span>
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </FilterSection>
          )}

          <button
            type="button"
            onClick={() => { setCat("all"); setBandId("any"); setTag(""); setQ(""); setMinRating(0); }}
            className="text-xs text-ink-muted underline hover:text-danger"
          >
            Clear all filters
          </button>
        </div>
      </aside>

      {/* Main */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="font-display text-[26px] font-extrabold text-ink leading-tight">{title}</h1>
            <p className="text-xs text-ink-muted">
              {/* Say "24 of 180" rather than "24 found" while more are still
                  unfetched — claiming a total the shopper can see isn't true. */}
              {typeof total === "number" && total > filtered.length
                ? `Showing ${filtered.length} of ${total} products`
                : `${filtered.length} product${filtered.length === 1 ? "" : "s"} found`}
            </p>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="bg-blob rounded-full text-sm font-semibold px-4 py-2 outline-none cursor-pointer"
          >
            <option value="popular">Sort: Popular</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {/* Mobile filter chips */}
        <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar mb-3">
          {showCategoryFilter && (
            <>
              <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
              {categories.slice(0, 7).map((c) => (
                <Chip key={c.slug} active={cat === c.slug} onClick={() => setCat(c.slug)}>
                  {c.short ?? c.name}
                </Chip>
              ))}
            </>
          )}
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.clear}
                className="bg-brand-50 text-brand text-xs font-medium px-2.5 py-1 rounded-full hover:bg-brand hover:text-white transition"
              >
                {f.label} ×
              </button>
            ))}
          </div>
        )}

        {/* An empty category is not a filter miss. The grid's "no products
            match your filters" read as a bug on /shop/snacks, which simply has
            nothing in it yet. */}
        {loaded.length === 0 ? (
          <div className="py-16 text-center text-ink-muted bg-surface">
            <p className="text-lg">Nothing here yet.</p>
            <p className="text-sm mt-2">
              <Link href="/shop" className="text-brand hover:underline">Browse the full catalogue</Link>
            </p>
          </div>
        ) : (
          <ProductGrid products={filtered} sidebar />
        )}

        {hasMore && (
          <div className="mt-8 flex flex-col items-center gap-2">
            {loadError && (
              <p className="text-[13px] text-danger">
                Couldn't load more products. Check your connection and try again.
              </p>
            )}
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="inline-flex items-center justify-center rounded-xl bg-ink px-6 py-3 text-[14px] font-bold text-bg transition-colors hover:bg-ink/85 disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : loadError ? "Try again" : "Load more products"}
            </button>
            {typeof total === "number" && (
              <p className="text-xs text-ink-muted">
                {loaded.length} of {total} loaded
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="border-b border-line/5 pb-3 mb-3 last:border-b-0">
      <summary className="cursor-pointer font-display font-extrabold text-[16px] text-ink mb-2 list-none flex items-center justify-between">
        {title}
        <span className="text-ink-muted text-base group-open:rotate-45 transition">−</span>
      </summary>
      {children}
    </details>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
        active ? "bg-brand text-white border-brand" : "bg-surface text-ink border-line/10 hover:border-brand"
      }`}
    >
      {children}
    </button>
  );
}
