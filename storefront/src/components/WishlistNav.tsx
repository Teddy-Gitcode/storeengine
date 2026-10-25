"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist-store";

/** Header wishlist entry with a live saved-count badge. */
export default function WishlistNav() {
  const count = useWishlist((s) => s.ids.length);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Link
      href="/wishlist"
      className="relative flex flex-col items-center text-[11px] text-ink-muted hover:text-brand transition-colors"
      aria-label={`Wishlist${mounted && count > 0 ? `, ${count} saved` : ""}`}
    >
      <Heart size={22} strokeWidth={1.8} />
      <span>Wishlist</span>
      {mounted && count > 0 && (
        <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 grid place-items-center bg-brand text-white text-[10px] font-semibold rounded-full">
          {count}
        </span>
      )}
    </Link>
  );
}
