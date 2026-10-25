"use client";
import { useEffect, useRef, useState } from "react";

/**
 * A muted looping video layered behind a block's own background.
 *
 * It renders nothing at all when the visitor prefers reduced motion, and only
 * loads once it is near the viewport — an autoplaying background above the
 * fold otherwise costs more than the rest of the page. Whatever sits behind
 * it (a hero gradient, a poster image) stays in the DOM, so every one of
 * those cases degrades to a still rather than a hole.
 */
export default function ReelBackground({
  src,
  className = "-z-10",
}: {
  src: string;
  /** Stacking for the layer — callers differ on what it must sit behind. */
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    const node = holder.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={holder} aria-hidden className={`absolute inset-0 pointer-events-none ${className}`}>
      {show && (
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
