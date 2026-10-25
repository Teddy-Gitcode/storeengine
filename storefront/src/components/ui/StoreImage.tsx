import Image, { type ImageProps } from "next/image";
import { canOptimizeImage } from "@/lib/images";

/* Every picture in the shop, so nobody has to remember when the optimizer
 * refuses one.
 *
 * `next/image` is not a component you can point at an arbitrary URL: the
 * optimizer answers 400 — a broken image, not a degraded one — for a host
 * outside `images.remotePatterns` and for any SVG while `dangerouslyAllowSVG`
 * is off. Both cases are ordinary here rather than exotic:
 *
 *  - `/products/placeholder-1.svg` is the fallback behind every imageless
 *    product, wishlist row and category card, so an SVG can surface in almost
 *    any slot on the site;
 *  - a hero slide's image is pasted into the admin as free text, so it can
 *    point anywhere.
 *
 * Both simply lose optimisation here, which is what the whole storefront did
 * until we turned it on. Optimisation is the improvement; falling back to the
 * old behaviour for two edge cases is not a regression.
 *
 * Otherwise this is `next/image` — same props, same `sizes`, same `priority`.
 * Use it instead of importing `next/image` directly, and the next image added
 * to the shop cannot reintroduce the 400. */
export default function StoreImage({ src, unoptimized, ...rest }: ImageProps) {
  return (
    <Image
      src={src}
      // An explicit `unoptimized` from the caller still wins; otherwise decide
      // from the src.
      unoptimized={unoptimized ?? !canOptimizeImage(typeof src === "string" ? src : null)}
      {...rest}
    />
  );
}
