import type { Product, ProductVariantInfo } from "./types";
import { mediaSrc } from "./images";
import {
  findProduct as findLocalProduct,
  products as localProducts,
  productsByCategory as localProductsByCategory,
  relatedProducts as localRelatedProducts
} from "./products";

type ApiCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
};

type ApiProductImage = {
  url?: string;
  source_url?: string;
  alt_text?: string;
  is_primary?: boolean;
};

type ApiProductVideo = {
  title?: string;
  video_url?: string;
  thumbnail_url?: string;
};

type ApiProductVariant = {
  id: number; label?: string; color?: string; size?: string;
  effective_price?: string; price?: string | null;
  stock_quantity?: number; image_url?: string; is_default?: boolean;
};

type ApiProduct = {
  id: number;
  legacy_id?: string;
  sku?: string;
  name: string;
  slug: string;
  category: ApiCategory;
  short_description?: string;
  description?: string;
  price: string;
  compare_at_price?: string | null;
  weight_grams?: number;
  is_featured?: boolean;
  rating?: number | null;
  review_count?: number;
  units_sold?: number;
  images?: ApiProductImage[];
  videos?: ApiProductVideo[];
  metadata?: Record<string, unknown>;
  brand?: { id: number; name: string; slug: string } | null;
  tags?: { id: number; name: string; slug: string }[];
  variants?: ApiProductVariant[];
  headline_variant?: ApiProductVariant | null;
  stock?: { quantity_on_hand?: number; allow_backorder?: boolean } | null;
};

type Paginated<T> = {
  results?: T[];
  count?: number;
  next?: string | null;
};

/** How many products a listing asks for at a time. The API caps page_size at 200. */
export const PRODUCTS_PER_PAGE = 48;

/** The API's `max_page_size`. Pages that resolve merchant-curated slugs against
 *  the whole catalogue (Offers, Flash deals) ask for this rather than the
 *  listing default, which silently hid every product past the 48th. */
export const CATALOG_MAX_PAGE_SIZE = 200;

import { API_BASE } from "./api-base";

const imageToneByCategory: Record<string, Product["imageTone"]> = {
  apparel: "green",
  footwear: "teal",
  accessories: "amber",
  "home-living": "coral",
  electronics: "blue",
  "beauty-care": "pink"
};

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“"
};

/**
 * Catalogues imported from WooCommerce carry HTML in plain-text fields: names
 * read "Enveloped &amp; tagged", and descriptions arrive wrapped in
 * `<span class="fontstyle0">` or are nothing but an empty `<h3></h3>`. React
 * escapes all of that, so it reaches the shopper verbatim. Flattening here
 * keeps every surface honest without asking the merchant to re-key 80 records.
 */
function plainText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, code: string) => {
      if (code.startsWith("#x") || code.startsWith("#X")) {
        return String.fromCodePoint(parseInt(code.slice(2), 16));
      }
      if (code.startsWith("#")) return String.fromCodePoint(Number(code.slice(1)));
      return namedEntities[code.toLowerCase()] ?? match;
    })
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapVariant(v: ApiProductVariant, productPrice: string): ProductVariantInfo {
  return {
    id: v.id,
    label: v.label || [v.color, v.size].filter(Boolean).join(" / ") || `#${v.id}`,
    color: v.color || "",
    size: v.size || "",
    price: toNumber(v.effective_price ?? v.price ?? productPrice),
    stockQty: toNumber(v.stock_quantity, 0),
    imageUrl: mediaSrc(v.image_url) || "",
    isDefault: Boolean(v.is_default),
  };
}

function mapProduct(p: ApiProduct): Product {
  const metadata = p.metadata || {};
  const primary = [...(p.images || [])].sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)))[0];
  // No demo-category default: a product with no category is uncategorised, not
  // "accessories".
  const categorySlug = p.category?.slug || "";
  const compareAt = p.compare_at_price ? toNumber(p.compare_at_price) : undefined;

  const variants = (p.variants || []).map((v) => mapVariant(v, p.price));
  // A range is priced by the option people actually buy — the API works out
  // which (most units sold, else the merchant's default). Without that, a tea
  // sold mostly in 250g bags led with "KSh 4", the price of one sachet.
  const headline = p.headline_variant ? mapVariant(p.headline_variant, p.price) : undefined;
  const price = headline?.price ?? toNumber(p.price);
  const prices = variants.map((v) => v.price);
  const cheapest = prices.length ? Math.min(...prices) : price;

  const title = plainText(p.name) || p.name;

  const gallery = [...(p.images || [])]
    .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)))
    .map((img) => ({ url: mediaSrc(img.url || img.source_url) || "", alt: plainText(img.alt_text) || title }))
    .filter((img) => img.url);

  return {
    id: String(p.legacy_id || p.id),
    productId: p.id,
    sku: p.sku || "",
    slug: p.slug,
    title,
    category: categorySlug,
    price,
    priceOld: compareAt && compareAt > price ? compareAt : undefined,
    // Every uploaded URL goes through `mediaSrc`: Django stamps these with
    // whichever host asked — `backend:8000` during SSR, `localhost:8000` from
    // the browser — and only one of the two is reachable from wherever the
    // picture is finally fetched.
    image: mediaSrc(primary?.url || primary?.source_url) || "/products/placeholder-1.svg",
    images: gallery,
    imageTone: imageToneByCategory[categorySlug] || "gray",
    badge: compareAt && compareAt > price ? "sale" : p.is_featured ? "hot" : undefined,
    // "HOT" claimed popularity nothing measures. `is_featured` is a merchant
    // choice, so the badge says exactly that.
    badgeLabel: compareAt && compareAt > price ? "SALE" : p.is_featured ? "FEATURED" : undefined,
    // The API reports what approved reviews actually say. It used to default to
    // 4.7 when a product had none, which put a five-star row on every product
    // in a catalogue that has never been reviewed.
    rating: p.rating == null ? 0 : toNumber(p.rating),
    reviewCount: toNumber(p.review_count, 0),
    sold: toNumber(p.units_sold, 0),
    description: plainText(p.description) || plainText(p.short_description),
    shortDescription: plainText(p.short_description),
    weightGrams: p.weight_grams || undefined,
    variantOption: typeof metadata.variant_option === "string" ? metadata.variant_option : undefined,
    headlineVariantId: headline?.id,
    priceFrom: new Set(prices).size > 1 ? cheapest : undefined,
    stockQty: p.stock ? p.stock.quantity_on_hand ?? null : null,
    allowBackorder: p.stock?.allow_backorder ?? false,
    // Real Tag rows when the catalogue has them; legacy metadata otherwise, so
    // stores that never adopted tags keep whatever they had.
    tags: p.tags?.length ? p.tags.map((t) => t.name) : toStringArray(metadata.tags),
    brand: p.brand?.slug,
    brandName: p.brand?.name,
    variants,
    videos: (p.videos || [])
      .filter((v) => v.video_url)
      .map((v) => ({ title: v.title || "", url: mediaSrc(v.video_url as string), thumbnail: mediaSrc(v.thumbnail_url) || "" }))
  };
}

/** `missing` separates "the API answered 404" from "the API never answered",
 *  which decides whether falling back to the demo fixtures is honest. */
type ApiResult<T> = { ok: true; data: T } | { ok: false; missing: boolean };

async function apiFetch<T>(path: string): Promise<ApiResult<T>> {
  try {
    // Fresh every time. This was a 60-second cache, but Next serves the stale
    // copy to the first visitor after it expires — and on a quiet store that
    // is most visitors: a product archived an hour earlier was still listed
    // (clicking it said "not found") and its own page still said "In stock,
    // Add to cart". Every page is rendered per request anyway (the layout
    // reads the visitor's country), so the cache bought little.
    const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!response.ok) return { ok: false, missing: response.status === 404 };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, missing: false };
  }
}

async function apiGet<T>(path: string): Promise<T | null> {
  const result = await apiFetch<T>(path);
  return result.ok ? result.data : null;
}

function unpack<T>(payload: Paginated<T> | T[] | null): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.results || [];
}

export type CatalogCategory = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
};

export async function getCategories(): Promise<CatalogCategory[]> {
  // Asked for no page size and got the API's default 24. /shop/<slug> resolves
  // its category through this list, so category 25 onwards 404'd.
  const payload = await apiGet<Paginated<ApiCategory> | ApiCategory[]>(
    `/catalog/categories/?page_size=${CATALOG_MAX_PAGE_SIZE}`
  );
  const cats = unpack(payload).map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description || "",
    imageUrl: mediaSrc(c.image_url) || ""
  }));
  if (cats.length) return cats;
  // Same brand-neutral demo list the rest of the storefront falls back to.
  const { categories: localCategories } = await import("./categories");
  return localCategories.map((c) => ({ slug: c.slug, name: c.name, description: "", imageUrl: "" }));
}

export type ProductQuery = {
  q?: string;
  category?: string;
  featured?: boolean;
  /** 1-based, as DRF counts them. */
  page?: number;
  pageSize?: number;
};

export type ProductPage = {
  products: Product[];
  /** True when the API says another page exists — drives "Load more". */
  hasMore: boolean;
  /** Total matches across all pages, when the API reports it. */
  total: number;
};

/**
 * One page of products, with enough about the rest of them to page through.
 *
 * Listings used to send no `page_size` at all, so the API answered with its
 * default 24 and nothing could reach past that — a catalogue of 200 products
 * had 176 of them unreachable on the web, search included. Asking for a page
 * explicitly, and reporting whether another one exists, is what makes the
 * whole catalogue visible.
 */
export async function getProductsPage(params?: ProductQuery): Promise<ProductPage> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category) qs.set("category__slug", params.category);
  if (params?.featured !== undefined) qs.set("is_featured", String(params.featured));
  qs.set("page_size", String(params?.pageSize ?? PRODUCTS_PER_PAGE));
  if (params?.page && params.page > 1) qs.set("page", String(params.page));

  const payload = await apiGet<Paginated<ApiProduct> | ApiProduct[]>(`/catalog/products/?${qs}`);
  const products = unpack(payload).map(mapProduct);
  const meta = Array.isArray(payload) ? null : payload;

  return {
    products,
    hasMore: Boolean(meta?.next),
    total: meta?.count ?? products.length,
  };
}

export async function getProducts(params?: ProductQuery): Promise<Product[]> {
  const { products } = await getProductsPage(params);
  if (products.length) return products;

  let fallback = localProducts;
  if (params?.category) fallback = localProductsByCategory(params.category);
  if (params?.q) {
    const q = params.q.toLowerCase();
    fallback = fallback.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags || []).some((tag) => tag.toLowerCase().includes(q))
    );
  }
  if (params?.featured) fallback = fallback.filter((p) => p.badge === "hot" || p.badge === "sale");
  return fallback;
}

/** Curated product lists (hero-slide collections) — any mix of categories. */
export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (!ids.length) return [];
  const payload = await apiGet<Paginated<ApiProduct> | ApiProduct[]>(
    `/catalog/products/?ids=${ids.join(",")}`
  );
  const products = unpack(payload).map(mapProduct);
  // Preserve the curated order.
  products.sort((a, b) => ids.indexOf(a.productId) - ids.indexOf(b.productId));
  return products;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  const result = await apiFetch<ApiProduct>(`/catalog/products/${slug}/`);
  if (result.ok) return mapProduct(result.data);
  // A slug the catalogue says it has never heard of is a 404. It used to fall
  // through to the template's fixtures, so /product/classic-crewneck-tee served
  // a fake apparel page from a real tea merchant's storefront. Only a genuinely
  // unreachable API still falls back to the offline demo set.
  return result.missing ? undefined : findLocalProduct(slug);
}

export async function getRelatedProducts(current: Product, limit = 4): Promise<Product[]> {
  const payload = await apiGet<ApiProduct[]>(`/catalog/products/${current.slug}/related/`);
  if (payload?.length) return payload.map(mapProduct).slice(0, limit);
  const list = await getProducts({ category: current.category });
  const related = list.filter((p) => p.id !== current.id).slice(0, limit);
  return related.length ? related : localRelatedProducts(current, limit);
}

export type Review = {
  id: number;
  display_name: string;
  rating: number;
  title: string;
  body: string;
  is_verified_purchase: boolean;
  created_at: string;
};

export async function getReviews(slug: string): Promise<Review[]> {
  const payload = await apiGet<Paginated<Review> | Review[]>(`/catalog/products/${slug}/reviews/`);
  return unpack(payload);
}

export async function getRecommendations(productIds: number[]): Promise<Product[]> {
  if (productIds.length === 0) return [];
  const payload = await apiGet<ApiProduct[]>(`/catalog/recommendations/?ids=${productIds.join(",")}`);
  return (payload || []).map(mapProduct);
}
