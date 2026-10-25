"use client";
import StoreImage from "@/components/ui/StoreImage";
import { useEffect, useState } from "react";
import { useOptionalSelection } from "@/components/pdp/selection";
import type { ProductImageInfo } from "@/lib/types";

/* Main image with a thumbnail rail beneath it.
 *
 * The rail used to float over the bottom of the photo, which put the product's
 * other angles on top of the product. Below the frame they are a strip you scan
 * without anything being hidden, and there is room for more than four.
 *
 * Selecting on hover as well as click is the behaviour of every large shop: a
 * shopper comparing angles moves along the rail, and requiring a click for each
 * turns browsing into work. Focus does the same for the keyboard.
 *
 * Choosing a colour shows it, as in the app: the gallery jumps to that
 * option's photo, or shows it first when the gallery doesn't carry it. */
export default function ProductGallery({
  images,
  title,
  frameClassName = "",
  children,
}: {
  images: ProductImageInfo[];
  title: string;
  /** Applied to the image frame — the page owns the tone and the border. */
  frameClassName?: string;
  /** Overlays positioned against the frame: badges, the wishlist heart. */
  children?: React.ReactNode;
}) {
  const focusUrl = useOptionalSelection()?.variant?.imageUrl || "";
  const [index, setIndex] = useState(0);
  // The chosen option's photo when the product's own images don't include it.
  const [extra, setExtra] = useState("");
  useEffect(() => {
    if (!focusUrl) return;
    const tail = (u: string) => u.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
    const at = images.findIndex((img) => tail(img.url) === tail(focusUrl));
    if (at >= 0) {
      setExtra("");
      setIndex(at);
    } else {
      setExtra(focusUrl);
      setIndex(-1);
    }
  }, [focusUrl, images]);
  const current =
    index < 0 && extra ? { url: extra, alt: title } : images[Math.min(Math.max(index, 0), images.length - 1)];
  if (!current) return null;

  return (
    <div>
      <div className={`relative aspect-[4/5] overflow-hidden ${frameClassName}`}>
        {children}
        <StoreImage
          src={current.url}
          alt={current.alt || title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 460px"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto px-1 pb-2 pt-1">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setIndex(i)}
              onMouseEnter={() => setIndex(i)}
              onFocus={() => setIndex(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-pressed={i === index}
              className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-[10px] border-[3px] bg-surface shadow-photo transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                i === index ? "border-brand" : "border-surface hover:border-brand/50"
              }`}
            >
              <StoreImage src={img.url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
