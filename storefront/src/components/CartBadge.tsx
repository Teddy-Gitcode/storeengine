"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-store";

export default function CartBadge() {
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Link href="/cart" className="relative flex flex-col items-center text-[11px] text-ink-muted hover:text-brand transition-colors">
      <ShoppingCart size={22} strokeWidth={1.8} aria-hidden="true" />
      <span>Cart</span>
      {mounted && count > 0 && (
        <span className="absolute -top-1.5 -right-2 bg-danger text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
