import Link from "next/link";
import StoreImage from "@/components/ui/StoreImage";
import { getCategories } from "@/lib/catalog-api";
import { getCategoryGroups, type StorefrontCategoryGroup } from "@/lib/content-api";
import { type CategoryTileData } from "./CategoryTile";
import CategoryCollage from "./CategoryCollage";
import SectionHeader from "@/components/ui/SectionHeader";
import { ArrowRight } from "lucide-react";

/* "Shop by category".

   Grouping is opt-in. By default this is the plain tile grid it has always
   been — one tile per category, no container. A merchant who wants them
   themed creates panels in the admin (Content Management → Category Groups),
   and only then does the section become panels, each holding a few cards over
   a background image.

   Two panels, not three: at three the panel is ~300px on a 1024px screen, so
   a 2-up card inside it is only ~124px wide and the names crowd. */
const PANELS = 2;
const PER_PANEL = 4;

type Panel = {
  key: string;
  title: string;
  subtitle: string;
  image: string;
  overlay: string;
  text: string;
  /** Panel is dark — because it has artwork, or a colour of its own. */
  tinted: boolean;
  cards: CategoryTileData[];
};

const DEFAULT_OVERLAY = "#0B1A17";
const DEFAULT_TEXT = "#FFFFFF";

/* Colours land in inline styles, so only a plain 6-digit hex is let through —
   which is also what the admin writes, and what the scrim below can safely
   append an alpha channel to. */
function hexOr(value: string | undefined, fallback: string) {
  const raw = (value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function fromGroup(group: StorefrontCategoryGroup): Panel {
  const overlay = hexOr(group.overlay_color, "");
  return {
    key: `group-${group.id}`,
    title: group.title,
    subtitle: group.subtitle,
    image: group.background_image_url,
    overlay: overlay || DEFAULT_OVERLAY,
    text: hexOr(group.text_color, DEFAULT_TEXT),
    // A colour on its own is enough to make the panel a solid dark card —
    // a merchant who sets one without artwork still means it to show.
    tinted: Boolean(group.background_image_url || overlay),
    cards: group.categories.slice(0, PER_PANEL).map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      imageUrl: c.image_url,
    })),
  };
}

export default async function CategoryBanners() {
  const [categories, groups] = await Promise.all([getCategories(), getCategoryGroups()]);
  const panels = groups.slice(0, PANELS).map(fromGroup);
  if (panels.length === 0 && categories.length === 0) return null;

  return (
    <section aria-label="Shop by category" className="mt-8">
      {/* The category list, not the all-products grid — this section is
          about categories, so "See All" means all of them. */}
      <SectionHeader title="Categories" action={{ href: "/categories", label: "See All" }} />

      {panels.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
          {panels.map((panel) => (
            <CategoryPanel key={panel.key} panel={panel} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 12).map((category) => (
            <CategoryCollage
              key={category.slug}
              category={{ slug: category.slug, name: category.name, imageUrl: category.imageUrl }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryPanel({ panel }: { panel: Panel }) {
  // Artwork needs a scrim over it; a tint alone is already flat enough.
  const hasArt = Boolean(panel.image);

  return (
    <div
      className={`relative isolate overflow-hidden rounded-2xl p-3.5 sm:p-4 lg:p-5 ${
        panel.tinted ? "" : "bg-surface-alt border border-line/10"
      }`}
      style={panel.tinted ? { backgroundColor: panel.overlay } : undefined}
    >
      {panel.image && (
        <StoreImage
          src={panel.image}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover -z-10"
        />
      )}
      {hasArt && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, ${panel.overlay}C0, ${panel.overlay}E6)` }}
        />
      )}

      {panel.title && (
        <header className="mb-3" style={{ color: panel.tinted ? panel.text : undefined }}>
          <h3 className={`text-[16px] font-bold leading-tight ${panel.tinted ? "" : "text-ink"}`}>
            {panel.title}
          </h3>
          {panel.subtitle && (
            <p className={`text-[12px] mt-0.5 opacity-75 ${panel.tinted ? "" : "text-ink-muted"}`}>
              {panel.subtitle}
            </p>
          )}
        </header>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {panel.cards.map((card) => (
          <PanelCard key={card.slug} card={card} />
        ))}
      </div>
    </div>
  );
}

/* The card used inside a panel. Not the standalone tile: these sit on the
   merchant's own artwork, so they carry their own image and a scrim rather
   than a pastel background that would fight it.

   The per-slug placeholder map that used to sit here only ever matched the
   template's six demo categories, so on any real catalogue every card without
   artwork already resolved to the same drawing it now uses outright. */
function PanelCard({ card }: { card: CategoryTileData }) {
  const art = card.imageUrl || "/products/placeholder-1.svg";
  // The merchant's own artwork is a photo and crops well; the shipped
  // placeholders are line drawings that lose their subject when cropped.
  const fit = card.imageUrl ? "object-cover" : "object-contain p-3";

  // Height is set outright rather than by aspect-ratio: the two contradict
  // each other once the card is narrow, and the ratio is the one that loses.
  return (
    <Link
      href={`/shop/${card.slug}`}
      className="group relative flex flex-col justify-end overflow-hidden rounded-xl p-3 sm:p-3.5 h-[200px] sm:h-[250px] lg:h-[280px] xl:h-[320px] bg-black/25 transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
    >
      <StoreImage
        src={art}
        alt=""
        fill
        sizes="(max-width: 768px) 45vw, 260px"
        className={`${fit} transition-transform duration-300 group-hover:scale-105`}
      />
      {/* Keeps the name legible whatever the photo is doing underneath. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/5 pointer-events-none"
      />
      <div className="relative text-white">
        <div className="text-[13px] sm:text-[14px] lg:text-[15px] font-bold leading-tight line-clamp-2 drop-shadow-sm">
          {card.name}
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-75 group-hover:opacity-100 mt-0.5">
          Shop <ArrowRight size={12} aria-hidden />
        </div>
      </div>
    </Link>
  );
}
