"use client";
import Link from "next/link";
import StoreImage from "@/components/ui/StoreImage";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";
import { productTone } from "@/lib/product-tone";
import { unitRate } from "@/lib/unit-price";
import { shippingTerms } from "@/lib/shipping";
import { useStoreSettings } from "@/lib/store-context";
import { useBuy } from "@/lib/use-buy";
import Stars from "@/components/Stars";
import WishlistButton from "@/components/WishlistButton";
import BuyButtons from "@/components/product/BuyButtons";
import Pill from "@/components/ui/Pill";
import Price from "@/components/ui/Price";

export default function ProductCard({ product }: { product: Product }) {
  const buy = useBuy(product);
  const stock = buy.stock;

  const settings = useStoreSettings();
  const freeShipThreshold = shippingTerms(settings).threshold;
  const discount = product.priceOld ? Math.round((1 - product.price / product.priceOld) * 100) : 0;
  const hasDiscount = discount > 0;
  const freeShip = freeShipThreshold > 0 && product.price >= freeShipThreshold;
  const reviewCount = product.reviewCount ?? 0;

  // The option the price belongs to, so the figure is attributable.
  const headline = product.variants?.find((v) => v.id === product.headlineVariantId);
  // "5 sizes from" reads better than "5 options from" when the catalogue has
  // named the dimension; a bare plural of "Bag type" would not, so it stays
  // "options" unless the word takes an -s cleanly.
  const option = product.variantOption?.toLowerCase();
  const optionWord = option === "size" || option === "flavour" || option === "quantity"
    ? `${option}s`
    : "options";

  // What the priced pack works out at per gram, so two teas can be compared
  // from the grid without opening either. The shelf-edge form — "KSh 0.46/g" —
  // because a card has no room to spell it out.
  const rate = unitRate(product.price, headline?.label ?? "", product.title);
  const meta = [
    rate && `${money(rate.amount)}/${rate.unit}`,
    product.priceFrom != null && `${product.variants!.length} ${optionWord} from ${money(product.priceFrom)}`,
  ].filter(Boolean);

  return (
    // Shoppe's card is the photograph in a white mat with a soft drop; the
    // name and price sit underneath on the page, not inside another box.
    <li className="group flex flex-col relative">
      {/* Wishlist heart — a sibling of the card link, not a child of it: a
          button nested inside an anchor is neither valid nor operable by
          keyboard or screen reader. It stays put; the <li> is the positioning
          context either way. */}
      <WishlistButton
        productId={product.productId}
        className="absolute right-3 top-3 z-10 h-8 w-8 bg-surface/90 shadow-sm backdrop-blur hover:bg-surface"
      />

      <Link href={`/product/${product.slug}`} className="flex-1 flex flex-col">
        {/* Inset badges, rounded — read cleanly against rounded card */}
        {/* One badge, top left: a markdown outranks a label, because a shopper
            comparing a row of cards is reading for the number. */}
        {hasDiscount ? (
          <Pill tone="danger" size="xs" className="absolute left-3.5 top-3.5 z-10 shadow-sm">
            −{discount}%
          </Pill>
        ) : product.badge === "new" ? (
          <Pill tone="brand" size="xs" className="absolute left-3.5 top-3.5 z-10 shadow-sm">
            New
          </Pill>
        ) : product.badge === "hot" ? (
          <Pill tone="accent" size="xs" className="absolute left-3.5 top-3.5 z-10 shadow-sm">
            Featured
          </Pill>
        ) : null}

        {/* Image */}
        <div className="rounded-xl bg-surface p-[5px] shadow-photo transition-shadow duration-300 group-hover:shadow-cardHover dark:border dark:border-line/10">
          <div className={`relative aspect-[4/5] overflow-hidden rounded-[9px] ${productTone(product.imageTone)}`}>
            <StoreImage
              src={product.image}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1200px) 25vw, 240px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Body */}
        <div className="px-1 pt-2.5 pb-1 flex flex-col gap-0.5">
          <h3 title={product.title} className="font-sans text-[13px] text-ink line-clamp-2 leading-snug min-h-[34px]">
            {product.title}
          </h3>

          {/* A range is priced by the pack people actually buy, named beside
              the figure: "KSh 4" for a tea that runs to 1kg reads as the price
              of whatever is in the photo. The rate and the cheapest option go
              on the line below — enough to compare two teas from the grid,
              without either one leading. */}
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <Price amount={product.price} compareAt={product.priceOld} size="md" />
            {headline && <span className="text-[10.5px] text-ink-muted">{headline.label}</span>}
          </div>
          {meta.length > 0 && (
            <div className="text-[10.5px] leading-snug text-ink-muted">{meta.join(" · ")}</div>
          )}

          {/* Only products that have actually been reviewed get a star row. */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-ink-muted">
              <Stars value={product.rating} size={12} />
              <span className="text-[10px]">
                {product.rating.toFixed(1)} ({reviewCount.toLocaleString()})
              </span>
            </div>
          )}

          {!stock.canBuy ? (
            <div className="text-[10px] text-danger font-semibold uppercase tracking-wide mt-0.5">
              {stock.label}
            </div>
          ) : freeShip ? (
            <div className="text-[10px] text-brand font-semibold uppercase tracking-wide mt-0.5">
              Free delivery
            </div>
          ) : null}
        </div>
      </Link>

      {/* The buttons sit outside the card's link, not inside it: a button
          nested in an anchor is neither valid nor keyboard-operable.
          A product sold in sizes or flavours cannot be added from here —
          checkout refuses a line with no option chosen — so the card sends
          the shopper to choose one instead. */}
      {product.variants?.length ? (
        <div className="px-1 pt-1">
          <Link
            href={`/product/${product.slug}`}
            className="flex items-center justify-center rounded-xl bg-blob py-2 text-[12.5px] font-bold text-ink transition-colors hover:bg-brand hover:text-on-brand"
          >
            Choose {product.variantOption ? product.variantOption.toLowerCase() : "options"}
          </Link>
        </div>
      ) : (
        <BuyButtons buy={buy} layout="inline" size="sm" className="px-1 pt-1" />
      )}
    </li>
  );
}
