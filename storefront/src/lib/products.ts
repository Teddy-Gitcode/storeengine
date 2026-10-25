import type { Product } from "./types";

// Brand-neutral demo products mirroring the backend `seed_demo_catalog`
// command. Used only as an offline fallback when the API is unreachable —
// merchants manage their real catalog from the admin portal.
export const products: Product[] = [
  {
    id: "1001",
    productId: 1001,
    slug: "classic-crewneck-tee",
    title: "Classic Crewneck Tee",
    category: "apparel",
    price: 19,
    priceOld: 25,
    image: "/products/placeholder-1.svg",
    imageTone: "green",
    badge: "sale",
    badgeLabel: "-24%",
    rating: 4.7,
    sold: 820,
    description: "A soft, everyday cotton tee with a relaxed fit. Pre-shrunk and available year-round.",
    tags: ["bestseller", "cotton", "unisex"]
  },
  {
    id: "1002",
    productId: 1002,
    slug: "everyday-canvas-sneaker",
    title: "Everyday Canvas Sneaker",
    category: "footwear",
    price: 49,
    image: "/products/placeholder-2.svg",
    imageTone: "teal",
    badge: "hot",
    badgeLabel: "HOT",
    rating: 4.8,
    sold: 1240,
    description: "Lightweight low-top sneaker with a cushioned insole and durable rubber outsole.",
    tags: ["bestseller", "casual"]
  },
  {
    id: "1003",
    productId: 1003,
    slug: "minimal-leather-wallet",
    title: "Minimal Leather Wallet",
    category: "accessories",
    price: 29,
    priceOld: 39,
    image: "/products/placeholder-3.svg",
    imageTone: "amber",
    badge: "sale",
    badgeLabel: "-26%",
    rating: 4.6,
    sold: 340,
    description: "Slim bifold wallet in full-grain leather with six card slots.",
    tags: ["leather", "gift"]
  },
  {
    id: "1004",
    productId: 1004,
    slug: "stoneware-mug-set",
    title: "Stoneware Mug Set (4-piece)",
    category: "home-living",
    price: 34,
    image: "/products/placeholder-4.svg",
    imageTone: "coral",
    badge: "hot",
    badgeLabel: "HOT",
    rating: 4.9,
    sold: 210,
    description: "Hand-glazed stoneware mugs, dishwasher and microwave safe.",
    tags: ["kitchen", "gift"]
  },
  {
    id: "1005",
    productId: 1005,
    slug: "wireless-earbuds-go",
    title: "Wireless Earbuds Go",
    category: "electronics",
    price: 59,
    priceOld: 79,
    image: "/products/placeholder-1.svg",
    imageTone: "blue",
    badge: "sale",
    badgeLabel: "-25%",
    rating: 4.5,
    sold: 610,
    description: "Compact true-wireless earbuds with 24-hour battery life and USB-C charging case.",
    tags: ["audio", "travel"]
  },
  {
    id: "1006",
    productId: 1006,
    slug: "botanical-hand-cream",
    title: "Botanical Hand Cream",
    category: "beauty-care",
    price: 12,
    image: "/products/placeholder-2.svg",
    imageTone: "pink",
    rating: 4.7,
    sold: 480,
    description: "Fast-absorbing hand cream with shea butter and aloe. Fragrance-free.",
    tags: ["skincare", "vegan"]
  },
  {
    id: "1007",
    productId: 1007,
    slug: "linen-throw-blanket",
    title: "Linen Throw Blanket",
    category: "home-living",
    price: 69,
    image: "/products/placeholder-3.svg",
    imageTone: "gray",
    badge: "new",
    badgeLabel: "NEW",
    rating: 4.8,
    sold: 150,
    description: "Breathable stonewashed linen throw, 130x170cm.",
    tags: ["linen", "living-room"]
  },
  {
    id: "1008",
    productId: 1008,
    slug: "canvas-weekender-bag",
    title: "Canvas Weekender Bag",
    category: "accessories",
    price: 89,
    priceOld: 110,
    image: "/products/placeholder-4.svg",
    imageTone: "purple",
    badge: "sale",
    badgeLabel: "-19%",
    rating: 4.9,
    sold: 95,
    description: "Waxed-canvas weekender with leather trim and a padded laptop sleeve.",
    tags: ["travel", "premium"]
  }
];

// ---------- helpers ----------

export function findProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function productsByCategory(slug: string): Product[] {
  return products.filter((p) => p.category === slug);
}

export function featuredDeals(): Product[] {
  return products.filter((p) => p.badge === "sale" || p.badge === "hot").slice(0, 4);
}

export function relatedProducts(current: Product, limit = 4): Product[] {
  return products.filter((p) => p.category === current.category && p.id !== current.id).slice(0, limit);
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q))
  );
}
