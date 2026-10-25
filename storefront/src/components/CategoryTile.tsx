import Link from "next/link";
import StoreImage from "@/components/ui/StoreImage";
import { ArrowRight } from "lucide-react";

/* The standalone category tile — used wherever categories are listed on their
   own, ungrouped: the homepage's "Shop by category" and the /categories page.
   Cards inside an admin-created group panel are a different shape (they sit on
   a dark background) and live in CategoryBanners. */

export type CategoryTileData = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
};

/* There used to be a slug→palette map here covering the template's six demo
   categories (apparel, footwear, electronics…). No real merchant's slugs match
   it, so every tile fell through to the neutral style anyway — while a store
   that happened to name a category "electronics" got an unrelated blue pastel
   and a placeholder line drawing. One neutral tile, used by everything without
   its own artwork, is what the map was actually delivering. */
const tileStyle = { bg: "bg-[#F1EFE8]", img: "/products/placeholder-1.svg" };

/** The grid these tiles are laid out in — shared so the homepage section and
    the /categories page stay identical. */
export const categoryGridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3";

export default function CategoryTile({ category }: { category: CategoryTileData }) {
  const art = category.imageUrl || tileStyle.img;

  return (
    <Link
      href={`/shop/${category.slug}`}
      className={`${tileStyle.bg} group relative block aspect-[4/5] overflow-hidden rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-cardHover`}
    >
      {/* The photograph is the tile. It used to be dimmed at both ends at once
          — 65% black over the top for the name, 55% over the bottom for "Shop
          now" — which left the middle third as the only part of the picture
          anyone could see, and on a muted photograph that reads as a grey box
          with a label on it. The merchant's own artwork is a category's whole
          argument for being clicked. */}
      <StoreImage
        src={art}
        alt=""
        fill
        sizes="(max-width: 640px) 46vw, (max-width: 1024px) 33vw, 200px"
        className={`${
          category.imageUrl ? "object-cover" : "object-contain p-6"
        } transition-transform duration-300 group-hover:scale-105`}
      />

      {/* One band along the bottom instead, sized to the name: translucent, and
          dense where the text sits so it holds up over a pale photograph too.
          The name is the label and the arrow is the affordance — "Shop now"
          underneath said again, in words, what an arrow on a card that is
          entirely a link already says. */}
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black/85 to-black/45 px-3 py-2.5">
        <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight text-white line-clamp-2">
          {category.name}
        </span>
        <ArrowRight
          size={18}
          aria-hidden
          className="shrink-0 text-white transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
