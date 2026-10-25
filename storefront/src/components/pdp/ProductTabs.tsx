"use client";
import { useEffect, useRef, useState } from "react";

export type ProductTab = { id: string; label: string; content: React.ReactNode };

/* Product Details · Additional Information · Customer Reviews.
 *
 * Every panel is rendered and the inactive ones are only hidden, so the long
 * copy and the reviews stay in the page for search engines and for find-in-page.
 * A link to `#reviews` (the star rating under the title) opens that tab and
 * scrolls to it. */
export default function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === id)) {
        setActive(id);
        root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  return (
    <div ref={root} className="scroll-mt-4">
      <div role="tablist" aria-label="Product information" className="flex flex-wrap gap-2 pb-2">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={tab.id}
              onClick={() => setActive(tab.id)}
              className={`rounded-full px-5 py-2.5 text-[13px] font-bold transition-colors ${
                selected ? "bg-brand text-on-brand" : "bg-blob text-ink hover:bg-brand/20"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={tab.id}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="pt-5"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
