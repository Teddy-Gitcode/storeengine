import Link from "next/link";
import StoreImage from "@/components/ui/StoreImage";
import Shelf from "@/components/ui/Shelf";
import SectionHeader from "@/components/ui/SectionHeader";
import { getProducts } from "@/lib/catalog-api";

/* The circular shortcut row under the hero.

   Two rewrites' worth of history, because both earlier versions were wrong in
   instructive ways. It began as hardcoded demo tags — Leather, Kitchen, Audio,
   Skincare — linking to /shop?tag=… routes no merchant's data fills. Pointing
   it at real categories fixed the content but made it a duplicate of the
   "Shop by category" grid immediately below: same items, same images, twice.

   So it shows featured *products* instead. One per category is featured, which
   means this row is a cross-section of the catalogue — a different question
   ("what's good?") from the grid's ("what kinds are there?"), which is what
   earns it the space.

   Falls back to the newest products for a store that hasn't featured anything,
   and renders nothing at all rather than an empty strip if there are none. */

export default async function QuickPicks() {
  const featured = await getProducts({ featured: true });
  const picks = (featured.length ? featured : await getProducts()).slice(0, 10);

  if (!picks.length) return null;

  return (
    // Shoppe's "Top Products": each photo in a white ring with a soft drop.
    <section className="mt-8">
    <SectionHeader title="Top Products" />
    <Shelf ariaLabel="Top products">
      {picks.map((product) => (
        <Link
          key={product.slug}
          href={`/product/${product.slug}`}
          className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-2 text-center"
        >
          <span className="relative w-[68px] h-[68px] rounded-full overflow-hidden bg-surface-alt ring-[5px] ring-surface shadow-photo transition-transform group-hover:scale-105">
            {product.images?.[0]?.url ? (
              <StoreImage
                src={product.images[0].url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : null}
          </span>
          <span className="text-[12px] text-ink-muted group-hover:text-brand font-medium line-clamp-2 leading-tight">
            {product.title}
          </span>
        </Link>
      ))}
    </Shelf>
    </section>
  );
}
