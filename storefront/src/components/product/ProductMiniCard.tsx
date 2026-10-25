import StoreImage from "@/components/ui/StoreImage";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { productTone } from "@/lib/product-tone";
import Price from "@/components/ui/Price";
import Pill from "@/components/ui/Pill";
import Stars from "@/components/Stars";

/* The narrow card that lives in a sideways-scrolling row.
 *
 * The full ProductCard is a poor fit there: it carries two buttons and a
 * wishlist heart, which at 150px wide leaves no room for the thing being sold.
 * A shelf card has one job — be recognisable and priced well enough to tap —
 * so it shows the photo, two lines of name, the rating it has actually earned,
 * and the price.
 *
 * Deliberately a link and nothing else: no button inside it, so the whole card
 * is one target, which is what a thumb wants. */
export default function ProductMiniCard({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const discount = product.priceOld
    ? Math.round((1 - product.price / product.priceOld) * 100)
    : 0;
  const reviewCount = product.reviewCount ?? 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className={`group w-[150px] shrink-0 snap-start sm:w-[168px] ${className}`}
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-lg border border-line/10 ${productTone(product.imageTone)}`}
      >
        <StoreImage
          src={product.image}
          alt={product.title}
          fill
          sizes="168px"
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
        />
        {discount > 0 && (
          <Pill tone="danger" size="xs" className="absolute left-2 top-2 rounded">
            −{discount}%
          </Pill>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-ink transition-colors group-hover:text-brand">
        {product.title}
      </p>

      {reviewCount > 0 && (
        <span className="mt-1 flex items-center gap-1">
          <Stars value={product.rating} size={11} />
          <span className="text-[11px] text-ink-muted tabular-nums">({reviewCount})</span>
        </span>
      )}

      <Price amount={product.price} compareAt={product.priceOld} size="sm" className="mt-1" />
    </Link>
  );
}
