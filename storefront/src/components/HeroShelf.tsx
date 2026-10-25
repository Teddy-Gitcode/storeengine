import Money from "@/components/ui/Money";
import Link from "next/link";
import StoreImage from "@/components/ui/StoreImage";
import HeroBanner from "./HeroBanner";
import {
  dealLook,
  getDeals,
  getHeroSlides,
  FEATURED_LOOK,
  FLASH_LOOK,
  type DealLook,
  type StorefrontDeal,
} from "@/lib/content-api";
import { getProducts } from "@/lib/catalog-api";
import type { Product } from "@/lib/types";
import { ArrowRight } from "lucide-react";

/* The two tiles beside the hero banner. Each follows a deal from the admin —
   the flash sale on the left, the featured deal on the right — and falls back
   to the palette and heuristic they had before deals drove them. */
const TILE_LOOKS: DealLook[] = [
  // `ctaLabel` is the shelf's "See all", which on a tile that opens one
  // product would promise a list it does not lead to.
  { ...FLASH_LOOK, headline: "Today's deal", ctaLabel: "Shop now", from: "#FAEEDA", to: "#FAEEDA", text: "#412402", accent: "#412402" },
  { ...FEATURED_LOOK, headline: "Featured", ctaLabel: "Shop now", from: "#EAF3DE", to: "#EAF3DE", text: "#3B6D11", accent: "#3B6D11" },
];

/* No artwork of its own — see `image` in catalog-api. The shipped fallback is
   a line drawing, which loses its subject the moment it is cropped. */
const DRAWN_PLACEHOLDER = "/products/placeholder-";

export default async function HeroShelf() {
  const [banners, products, flash, featured] = await Promise.all([
    getHeroSlides(),
    getProducts(),
    getDeals("flash"),
    getDeals("featured"),
  ]);

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const led = (deals: StorefrontDeal[]) =>
    deals.flatMap((d) => d.products).map((p) => bySlug.get(p.slug)).find(Boolean);

  /* A live deal names the tile's product; otherwise the heuristic stands —
     best markdown on the left, and on the right the merchant's own featured
     flag. It used to be the highest-rated remaining product, but `rating`
     defaults to 4.7 for every product a catalogue has no ratings for, so on an
     imported catalogue that sort ranked nothing and "Editor's pick" landed on
     whichever product happened to come back first. */
  const deal =
    led(flash) ??
    [...products].filter((p) => p.priceOld && p.priceOld > p.price).sort((a, b) => b.sold - a.sold)[0];
  const remaining = products.filter((p) => p.id !== deal?.id);
  const pick =
    led(featured) ??
    remaining.find((p) => p.badgeLabel === "HOT") ??
    [...remaining].sort((a, b) => b.rating - a.rating)[0];

  const tiles: { product: Product; look: DealLook }[] = [
    { product: deal, look: dealLook(flash[0], TILE_LOOKS[0]) },
    { product: pick, look: dealLook(featured[0], TILE_LOOKS[1]) },
  ].filter((t): t is { product: Product; look: DealLook } => Boolean(t.product));

  return (
    <section className="grid gap-3 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px] mt-4">
      <HeroBanner banners={banners} />
      {/* One column at every width. Side by side on a phone each tile was
          ~168px wide, which is too narrow for a picture and a sentence to sit
          beside each other, so the picture had nowhere to go but a corner. */}
      <div className="grid gap-3">
        {tiles.map(({ product, look }) => {
          const drawn = product.image.startsWith(DRAWN_PLACEHOLDER);
          return (
            <Link
              key={product.slug}
              href={`/product/${product.slug}`}
              style={{ background: look.from, color: look.text }}
              className="group relative isolate flex min-h-[156px] flex-col justify-between overflow-hidden rounded-xl border border-line/5 py-4 pl-4 pr-[38%] transition-all hover:shadow-cardHover md:min-h-0"
            >
              {/* The photograph runs off the right edge and the tile's own
                  colour dissolves into it, so the two read as one surface.
                  It used to be an 80px contained box pinned in the bottom
                  corner: a photo floating in dead space with its own edges
                  showing, and the copy squeezed into a 140px column beside
                  nothing. */}
              <div className="absolute inset-y-0 right-0 -z-10 w-[46%]">
                <StoreImage
                  src={product.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 46vw, 160px"
                  className={`${drawn ? "object-contain p-4" : "object-cover"} transition-transform duration-300 group-hover:scale-105`}
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(to right, ${look.from} 0%, transparent 64%)` }}
                />
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest opacity-80">{look.headline}</div>
                <div className="mt-1 text-[15px] font-semibold leading-tight line-clamp-2">{product.title}</div>
                <p className="mt-1 text-[12px] leading-snug opacity-70 line-clamp-2">{look.subheadline}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-[17px] font-bold leading-none" style={{ color: look.accent }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">From </span>
                  <Money amount={product.price} />
                </span>
                {/* Inverted rather than white: the colours are the merchant's
                    to set, and this pair is legible whichever way round they
                    make them. Not a nested <a> — the whole tile is the link. */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold"
                  style={{ background: look.text, color: look.from }}
                >
                  {look.ctaLabel}
                  <ArrowRight size={13} aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
