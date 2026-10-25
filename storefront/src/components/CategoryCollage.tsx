import Link from "next/link";
import StoreImage from "@/components/ui/StoreImage";
import { getProductsPage } from "@/lib/catalog-api";

/* Shoppe's category card: a white card holding four photos from the category
   in a 2×2 grid, the name in Raleway and the number of products in a pastel
   pill. The photos and the count come from the server per category, so the
   count is the real one rather than whatever fitted in the first page. */
export default async function CategoryCollage({
  category,
}: {
  category: { slug: string; name: string; imageUrl?: string };
}) {
  const { products, total } = await getProductsPage({ category: category.slug, pageSize: 4 });
  // The products' own photos first: a category's banner image is often a
  // flat backdrop that reads as an empty cell at this size.
  const photos = [
    ...products.map((p) => p.image).filter(Boolean),
    ...(category.imageUrl ? [category.imageUrl] : []),
  ].slice(0, 4);
  // Fewer than four repeat rather than leave a hole in the grid.
  const cells = Array.from({ length: 4 }, (_, i) => (photos.length ? photos[i % photos.length] : ""));

  return (
    <Link
      href={`/shop/${category.slug}`}
      className="group flex flex-col gap-2 rounded-xl bg-surface p-1.5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-cardHover dark:border dark:border-line/10"
      aria-label={`${category.name}, ${total} products`}
    >
      <div className="grid grid-cols-2 gap-1">
        {cells.map((src, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-md bg-surface-alt">
            {src ? (
              <StoreImage
                src={src}
                alt=""
                fill
                sizes="(max-width: 768px) 22vw, 110px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <span className="font-display text-[16px] font-extrabold leading-tight text-ink line-clamp-1">
          {category.name}
        </span>
        {total > 0 && (
          <span className="shrink-0 rounded-md bg-blob px-2 py-0.5 text-[12px] font-extrabold text-ink">
            {total}
          </span>
        )}
      </div>
    </Link>
  );
}
