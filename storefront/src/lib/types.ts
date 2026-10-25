export type Category = {
  slug: string;
  name: string;
  short: string;
  dot: string;
  tile: string;
};

export type ProductImageInfo = {
  url: string;
  alt: string;
};

export type ProductVideoInfo = {
  title: string;
  url: string;
  thumbnail: string;
};

export type ProductVariantInfo = {
  id: number;
  label: string;
  color: string;
  size: string;
  price: number;
  stockQty: number;
  imageUrl: string;
  /** The merchant's pick of the option a card should lead with, before any
   *  sales exist to answer that. See `headlineVariantId`. */
  isDefault: boolean;
};

export type Product = {
  id: string;
  /** Numeric backend id — used for checkout, wishlist, and recommendations. */
  productId: number;
  /** The merchant's own article number. Empty when they don't keep one. */
  sku?: string;
  slug: string;
  title: string;
  category: string;
  price: number;
  priceOld?: number;
  image: string;
  images?: ProductImageInfo[];
  imageTone: "gray" | "green" | "teal" | "purple" | "coral" | "amber" | "pink" | "blue" | "red";
  badge?: "sale" | "hot" | "new";
  badgeLabel?: string;
  /** Average of approved reviews; 0 when there are none — see `reviewCount`. */
  rating: number;
  /** How many approved reviews the rating is averaged from. */
  reviewCount?: number;
  sold: number;
  description: string;
  /** Tag names from the catalogue's Tag model (not legacy metadata). */
  tags?: string[];
  /** Brand slug, for filtering; `brandName` is what gets displayed. */
  brand?: string;
  brandName?: string;
  /** Buyable variations. Empty for products sold as a single item. */
  variants?: ProductVariantInfo[];
  /** What the variations differ by — "Size", "Flavour", "Bag type" — when
   *  the catalogue names it. */
  variantOption?: string;
  /** The option a card prices and a product page opens on: whichever has sold
   *  the most, falling back to the merchant's default. `price` is already this
   *  option's price — a range's cheapest is `priceFrom`. */
  headlineVariantId?: number;
  /** The cheapest option, when the options are not all one price. */
  priceFrom?: number;
  /** The one-line summary under the title; `description` is the long copy. */
  shortDescription?: string;
  weightGrams?: number;
  videos?: ProductVideoInfo[];
  /** On-hand quantity from the backend; null/undefined = stock not tracked. */
  stockQty?: number | null;
  allowBackorder?: boolean;
};
