"use client";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist-store";

export default function WishlistButton({
  productId,
  className = "",
  size = 16,
}: {
  productId: number;
  className?: string;
  size?: number;
}) {
  const active = useWishlist((s) => s.ids.includes(productId));
  const toggle = useWishlist((s) => s.toggle);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(productId);
      }}
      className={`grid place-items-center rounded-full transition-all ${
        active ? "text-danger" : "text-ink-muted hover:text-danger"
      } ${className}`}
    >
      <Heart size={size} className={active ? "fill-current" : ""} />
    </button>
  );
}
