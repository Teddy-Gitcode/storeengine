export type SlideEffect = "fade" | "slide" | "flip";

export const TEXT_POSITIONS = [
  "top-left", "top-center", "top-right",
  "center-left", "center-center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
] as const;

export type SlideTextPosition = (typeof TEXT_POSITIONS)[number];
export type SlideImageShape = "circle" | "rounded" | "square" | "arch";

/* How a slide arranges itself.
   - "split": the long-standing hero — copy on the left, the creative framed in
     a shape on the right.
   - "showcase": the photo IS the slide. It fills the frame edge to edge, the
     slide's gradient veils the side the copy sits on, and the offer, the store
     trust badges and the CTA plate sit on top of the photograph. */
export const SLIDE_LAYOUTS = ["split", "showcase"] as const;
export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

/** The discount plate on a showcase slide, e.g. "UP TO" + "30% OFF". */
export type SlideOffer = { prefix: string; value: string };

export type HeroSlide = {
  id?: number;
  pill: string;
  title: string;
  sub: string;
  cta: string;
  href: string;
  gradientFrom: string;
  gradientTo: string;
  text: string;
  accent: string;
  image: string;
  imageAlt: string;
  /** Optional muted looping .mp4/.webm behind the slide's gradient. */
  video?: string;
  /** How strongly the gradient veils the reel, 0–100. Only used with a video. */
  videoOverlay?: number;
  /** Where the copy sits on a reel slide, e.g. "center-left". */
  textPosition?: SlideTextPosition;
  interval?: number;
  effect?: SlideEffect;
  kenburns?: boolean;
  imageShape?: SlideImageShape;
  /** Arrangement of the slide; "split" is the historical hero. */
  layout?: SlideLayout;
  /** Only read on a showcase slide, and only when `value` is non-empty. */
  offer?: SlideOffer;
  /** Short store promises along the bottom of the text panel, e.g.
   *  "Quality products". Typed per slide in the admin, at most three. */
  badges?: string[];
  /** False when the creative already carries its own lettering: the slide
   *  shows the image or reel bare, with only the CTA in the corner. */
  showText?: boolean;
  endsAt?: string | null;
};

export type StorefrontCampaign = {
  id: number;
  name: string;
  objective: string;
  objective_label: string;
  status: string;
  headline: string;
  audience: string;
  promotions: { id: number; name: string; code: string; status: string; value: string }[];
  placements: { id: number; title: string; placement: string; status: string }[];
  creative_assets: { id: number; name: string; asset_type: string; url: string; status: string }[];
  clicks: number;
  orders: number;
  revenue: string;
  ctr: number;
};

type ApiSlide = {
  id: number;
  title: string;
  eyebrow: string;
  subtitle: string;
  cta_label: string;
  cta_href: string;
  image_url: string;
  image_alt: string;
  video_url?: string;
  video_overlay_opacity?: number;
  text_position?: string;
  gradient_from: string;
  gradient_to: string;
  text_color: string;
  accent_color: string;
  ends_at?: string | null;
  metadata?: {
    animation?: { interval?: number; effect?: SlideEffect; kenburns?: boolean };
    image_shape?: string;
    layout?: string;
    offer?: { prefix?: string; value?: string };
    badges?: unknown;
    show_text?: boolean;
  };
};

/** Up to three short store promises; anything that isn't a string is dropped. */
function readBadges(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is string => typeof b === "string")
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 3);
}

import { API_BASE } from "./api-base";
import { mediaSrc } from "./images";

/* Shown only when the content API is unreachable. It used to be five demo
   slides — "Up to 30% off bestsellers", "free delivery on qualifying orders",
   "curated picks under $50", each linking to a demo category — so a store
   whose backend blipped advertised a sale it was not running, at a currency it
   does not use, to pages that 404. One slide that promises nothing and points
   at the catalogue is all a fallback can honestly be. */
export const fallbackHeroSlides: HeroSlide[] = [
  {
    pill: "SHOP",
    title: "Browse the store",
    sub: "",
    cta: "See all products",
    href: "/shop",
    gradientFrom: "#101820",
    gradientTo: "#1F2A33",
    text: "#FFFFFF",
    accent: "#FFD166",
    image: "/products/placeholder-1.svg",
    imageAlt: "",
  },
];

/* Category pages live at /shop/<slug>. "/category/<slug>" is what a merchant
   naturally types into the admin's CTA field — and what the seeded Ketepa
   slides carry — and it 404s, which turns the hero's one job into a dead end.
   Rewriting it costs nothing and no route of that name exists to shadow. */
function normaliseHref(href: string): string {
  const raw = href.trim();
  if (!raw) return "/shop";
  const match = /^\/categor(?:y|ies)\/(.+)$/.exec(raw);
  return match ? `/shop/${match[1]}` : raw;
}

/** Lands in a CSS alpha channel, so anything out of range is not usable. */
function clampPercent(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function mapSlide(slide: ApiSlide): HeroSlide {
  const anim = slide.metadata?.animation ?? {};
  const effect: SlideEffect = anim.effect === "slide" || anim.effect === "flip" ? anim.effect : "fade";
  return {
    id: slide.id,
    pill: slide.eyebrow || "FEATURED",
    title: slide.title,
    sub: slide.subtitle,
    cta: slide.cta_label || "Shop now",
    href: normaliseHref(slide.cta_href),
    gradientFrom: slide.gradient_from || "#1D4ED8",
    gradientTo: slide.gradient_to || "#1E3A8A",
    text: slide.text_color || "#FFFFFF",
    accent: slide.accent_color || "#FFD166",
    // Free-text columns: whatever host the admin was pointed at when the file
    // was uploaded is what every visitor gets. Re-homed so a stored
    // localhost URL does not follow the page onto someone else's device.
    image: mediaSrc(slide.image_url) || "/products/placeholder-1.svg",
    imageAlt: slide.image_alt || slide.title,
    video: mediaSrc(slide.video_url) || "",
    videoOverlay: clampPercent(slide.video_overlay_opacity, 85),
    textPosition: TEXT_POSITIONS.find((p) => p === slide.text_position) ?? "center-left",
    interval: typeof anim.interval === "number" && anim.interval > 0 ? anim.interval : 5500,
    effect,
    kenburns: anim.kenburns !== false,
    imageShape: (["rounded", "square", "arch"] as const).find(
      (s) => s === slide.metadata?.image_shape
    ) ?? "circle",
    layout: SLIDE_LAYOUTS.find((l) => l === slide.metadata?.layout) ?? "split",
    offer: {
      prefix: slide.metadata?.offer?.prefix?.trim() || "",
      value: slide.metadata?.offer?.value?.trim() || "",
    },
    badges: readBadges(slide.metadata?.badges),
    // Absent on slides saved before the switch existed — those keep their text.
    showText: slide.metadata?.show_text !== false,
    endsAt: slide.ends_at || null,
  };
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const response = await fetch(`${API_BASE}/content/slides/?placement=home_hero`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return fallbackHeroSlides;
    const payload = (await response.json()) as ApiSlide[] | { results?: ApiSlide[] };
    const slides = Array.isArray(payload) ? payload : payload.results || [];
    return slides.length ? slides.map(mapSlide) : fallbackHeroSlides;
  } catch {
    return fallbackHeroSlides;
  }
}

export async function getActiveCampaigns(): Promise<StorefrontCampaign[]> {
  try {
    const response = await fetch(`${API_BASE}/content/campaigns/`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as StorefrontCampaign[] | { results?: StorefrontCampaign[] };
    return Array.isArray(payload) ? payload : payload.results || [];
  } catch {
    return [];
  }
}

/* ─── Admin-managed copy: FAQs and legal pages ─────────────────────────────
   These are edited in the admin (Promotions & Content → FAQ / Privacy /
   Terms). Nothing is returned when a document has not been written: the legal
   pages say so rather than showing terms the merchant never agreed to. */

export type StorefrontFaq = { id: number; question: string; answer: string };

export type LegalDocument = {
  title: string;
  /** Plain text or light HTML, authored in the admin. */
  body: string;
  updatedAt: string | null;
};

export async function getFaqs(): Promise<StorefrontFaq[]> {
  try {
    const response = await fetch(`${API_BASE}/content/faqs/`, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    const payload = (await response.json()) as StorefrontFaq[] | { results?: StorefrontFaq[] };
    const faqs = Array.isArray(payload) ? payload : payload.results || [];
    return faqs.filter((f) => f.question);
  } catch {
    return [];
  }
}

export async function getLegalPage(
  pageType: "privacy" | "terms",
  language = "en",
): Promise<LegalDocument | null> {
  try {
    const response = await fetch(
      `${API_BASE}/content/legal-pages/?page_type=${pageType}&language=${language}`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as
      | { title: string; body: string; updated_at?: string }[]
      | { results?: { title: string; body: string; updated_at?: string }[] };
    const pages = Array.isArray(payload) ? payload : payload.results || [];
    const page = pages[0];
    if (!page || !page.body?.trim()) return null;
    return { title: page.title, body: page.body, updatedAt: page.updated_at ?? null };
  } catch {
    return null;
  }
}

/* ─── Flash sales and featured deals ───────────────────────────────────────
   Created in the admin under Promotional Deals. Until a deal is switched on,
   callers fall back to the compare-at-price heuristic they used before, so an
   unconfigured store still shows a sensible shelf. */

export type StorefrontDeal = {
  id: number;
  title: string;
  kind: "flash" | "featured";
  deal_type: string;
  discount_percent: string;
  ends_at: string | null;
  /* Appearance, set in the admin. Every field may be blank — see `dealLook`. */
  headline?: string;
  subheadline?: string;
  badge_label?: string;
  cta_label?: string;
  cta_href?: string;
  gradient_from?: string;
  gradient_to?: string;
  text_color?: string;
  accent_color?: string;
  products: {
    id: number;
    name: string;
    slug: string;
    price: string;
    compare_at_price: string | null;
    category: string;
    image_url: string;
  }[];
};

/** Resolved copy + palette for a deal shelf. */
export type DealLook = {
  headline: string;
  subheadline: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string;
  /** Darker end of the panel gradient. */
  from: string;
  /** Lighter end of the panel gradient. */
  to: string;
  text: string;
  /** Prices, countdown digits, badge outline. */
  accent: string;
};

/* What the shelf looked like before any of this was editable — still the
   answer for a store that has never touched the appearance fields. */
export const FLASH_LOOK: DealLook = {
  headline: "Today's deals",
  subheadline: "Hand-picked deals · while stocks last",
  badge: "Flash Deal",
  ctaLabel: "See all",
  ctaHref: "/offers",
  from: "#085041",
  to: "#0F6E56",
  text: "#FFFFFF",
  accent: "#FCD96A",
};

export const FEATURED_LOOK: DealLook = {
  ...FLASH_LOOK,
  headline: "Featured deals",
  subheadline: "Picked by us, priced for you",
  badge: "Featured",
};

/** Merchant overrides on top of the built-in look; blanks keep the default. */
export function dealLook(deal?: StorefrontDeal | null, base: DealLook = FLASH_LOOK): DealLook {
  const pick = (value: string | undefined, fallback: string) => value?.trim() || fallback;
  return {
    headline: pick(deal?.headline, base.headline),
    subheadline: pick(deal?.subheadline, base.subheadline),
    badge: pick(deal?.badge_label, base.badge),
    ctaLabel: pick(deal?.cta_label, base.ctaLabel),
    ctaHref: pick(deal?.cta_href, base.ctaHref),
    from: hexOr(deal?.gradient_from, base.from),
    to: hexOr(deal?.gradient_to, base.to),
    text: hexOr(deal?.text_color, base.text),
    accent: hexOr(deal?.accent_color, base.accent),
  };
}

/* Colours land in inline styles, so anything that is not a plain hex value is
   dropped rather than passed through to CSS. */
function hexOr(value: string | undefined, fallback: string): string {
  const raw = (value || "").trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(raw) ? raw : fallback;
}

export async function getDeals(kind?: "flash" | "featured"): Promise<StorefrontDeal[]> {
  try {
    const query = kind ? `?kind=${kind}` : "";
    // Fresh, like the catalogue (see catalog-api.ts apiFetch): a deal lists
    // products, and a stale copy can offer one that has since been removed.
    const response = await fetch(`${API_BASE}/storefront/deals/${query}`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = (await response.json()) as StorefrontDeal[] | { results?: StorefrontDeal[] };
    const deals = Array.isArray(payload) ? payload : payload.results || [];
    return deals
      .filter((d) => d.products.length > 0)
      .map((d) => ({ ...d, products: d.products.map((p) => ({ ...p, image_url: mediaSrc(p.image_url) })) }));
  } catch {
    return [];
  }
}

/* ─── Category groups ──────────────────────────────────────────────────────
   The panels of "Shop by category", created in the admin under Content
   Management → Category Groups. Until one exists the section falls back to
   chunking the plain category list, so a fresh store still has the shelf. */

export type StorefrontCategoryGroup = {
  id: number;
  title: string;
  subtitle: string;
  background_image_url: string;
  overlay_color: string;
  text_color: string;
  categories: { id: number; name: string; slug: string; description: string; image_url: string }[];
};

export async function getCategoryGroups(): Promise<StorefrontCategoryGroup[]> {
  try {
    const response = await fetch(`${API_BASE}/content/category-groups/`, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    const payload = (await response.json()) as
      | StorefrontCategoryGroup[]
      | { results?: StorefrontCategoryGroup[] };
    const groups = Array.isArray(payload) ? payload : payload.results || [];
    // A panel with no categories has nothing to show — it would render as an
    // empty box, which is worse than not rendering at all.
    return groups
      .filter((g) => g.categories.length > 0)
      .map((g) => ({
        ...g,
        background_image_url: mediaSrc(g.background_image_url),
        categories: g.categories.map((c) => ({ ...c, image_url: mediaSrc(c.image_url) })),
      }));
  } catch {
    return [];
  }
}

/* ─── Promo popup ───────────────────────────────────────────────────────
   Created in the admin under Promo Popup. Already filtered server-side to
   published + inside its schedule window; the client only applies the
   frequency rule (see PromoPopupModal). */

export type PromoPopupFrequency = "every_visit" | "once_per_session" | "once_ever";

export type StorefrontPromoPopup = {
  id: number;
  /** The operator's name for the promo, and the image's alt text. */
  title: string;
  image_url: string;
  /** What the shopper reads. Blank on every promo made before the popup could
   *  carry words, which is why the modal still renders a bare image. */
  headline: string;
  body: string;
  cta_label: string;
  link_url: string;
  frequency: PromoPopupFrequency;
  updated_at: string;
};

export async function getPromoPopups(): Promise<StorefrontPromoPopup[]> {
  try {
    const response = await fetch(`${API_BASE}/content/promo-popups/?kind=popup`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as StorefrontPromoPopup[] | { results?: StorefrontPromoPopup[] };
    const popups = Array.isArray(payload) ? payload : payload.results || [];
    // A promo needs something to show: a picture, or words. It used to need a
    // picture, which is now a promo that can be all text and never appears.
    return popups
      .filter((p) => p.image_url || p.headline?.trim())
      .map((p) => ({ ...p, image_url: mediaSrc(p.image_url) }));
  } catch {
    return [];
  }
}
