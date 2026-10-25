"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuth, onLogin, onLogout } from "@/lib/auth-store";
import type { Product } from "@/lib/types";

// Guests keep wishlist product ids locally; signed-in customers are backed by
// the server. On login the local ids are merged up once (union), then the
// server copy wins.

type ApiWishlistProduct = { id: number };

type WishlistState = {
  ids: number[];
  hydrated: boolean;
  has: (productId: number) => boolean;
  toggle: (productId: number) => Promise<void>;
  sync: () => Promise<void>;
};

function isAuthed() {
  return Boolean(useAuth.getState().user);
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      hydrated: false,
      has: (productId) => get().ids.includes(productId),
      toggle: async (productId) => {
        const active = get().ids.includes(productId);
        // Optimistic flip either way; server call follows for signed-in users.
        set((state) => ({
          ids: active ? state.ids.filter((id) => id !== productId) : [...state.ids, productId],
        }));
        if (!isAuthed()) return;
        try {
          const response = active
            ? await fetch(`/api/account/wishlist/${productId}`, { method: "DELETE" })
            : await fetch("/api/account/wishlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id: productId }),
              });
          // A rejected write is as much a failure as a dropped one; without
          // this the heart stays filled for an item the server never saved.
          if (!response.ok) throw new Error("Wishlist write rejected.");
        } catch {
          // Roll back the optimistic change on network failure.
          set((state) => ({
            ids: active ? [...state.ids, productId] : state.ids.filter((id) => id !== productId),
          }));
        }
      },
      sync: async () => {
        if (!isAuthed()) return;
        const res = await fetch("/api/account/wishlist").catch(() => null);
        if (!res || !res.ok) return;
        const products = (await res.json()) as ApiWishlistProduct[];
        set({ ids: products.map((p) => p.id) });
      },
    }),
    {
      name: "store-wishlist",
      partialize: (state) => ({ ids: state.ids }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);

/** Fetch full product objects for the account wishlist tab (server copy when authed). */
export async function fetchWishlistProducts(): Promise<Product[] | null> {
  const res = await fetch("/api/account/wishlist").catch(() => null);
  if (!res || !res.ok) return null;
  const data = (await res.json()) as Array<{
    id: number;
    name: string;
    slug: string;
    price: string;
    compare_at_price?: string | null;
    category?: { slug?: string };
    images?: Array<{ url?: string; source_url?: string; is_primary?: boolean }>;
    rating?: number | null;
    review_count?: number;
    units_sold?: number;
    metadata?: Record<string, unknown>;
  }>;
  return data.map((p) => {
    const primary = [...(p.images || [])].sort(
      (a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary))
    )[0];
    const price = Number(p.price) || 0;
    const compareAt = p.compare_at_price ? Number(p.compare_at_price) : undefined;
    return {
      id: String(p.id),
      productId: p.id,
      slug: p.slug,
      title: p.name,
      category: p.category?.slug || "",
      price,
      priceOld: compareAt && compareAt > price ? compareAt : undefined,
      image: primary?.url || primary?.source_url || "/products/placeholder-1.svg",
      imageTone: "gray",
      rating: Number(p.rating) || 0,
      reviewCount: Number(p.review_count) || 0,
      sold: Number(p.units_sold) || 0,
      description: "",
    } satisfies Product;
  });
}

// Merge guest wishlist into the account right after login.
onLogin(() => {
  void (async () => {
    const { ids } = useWishlist.getState();
    if (ids.length > 0) {
      await fetch("/api/account/wishlist/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: ids }),
      }).catch(() => undefined);
    }
    await useWishlist.getState().sync();
  })();
});

// Saved items belong to the account, not to the browser.
onLogout(() => useWishlist.setState({ ids: [] }));
