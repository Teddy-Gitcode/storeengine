import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getProduct, getRelatedProducts, getReviews } from "@/lib/catalog-api";
import { formatMoney } from "@/lib/format";
import { publicMediaUrl } from "@/lib/images";
import { getStoreSettings } from "@/lib/settings-api";
import { shareCard } from "@/lib/share-card";
import { stockStatus } from "@/lib/stock";
import { productTone } from "@/lib/product-tone";
import type { Product } from "@/lib/types";
import AskAboutProduct from "@/components/AskAboutProduct";
import MobileBuyBar from "@/components/MobileBuyBar";
import ProductCard from "@/components/ProductCard";
import Stars from "@/components/Stars";
import ProductGallery from "@/components/ProductGallery";
import ProductVideos from "@/components/ProductVideos";
import RecommendationShelf from "@/components/RecommendationShelf";
import Reviews from "@/components/Reviews";
import WishlistButton from "@/components/WishlistButton";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pill from "@/components/ui/Pill";
import SectionHeader from "@/components/ui/SectionHeader";
import CheckoutAside from "@/components/pdp/CheckoutAside";
import ProductTabs from "@/components/pdp/ProductTabs";
import PurchasePanel from "@/components/pdp/PurchasePanel";
import ShareButton from "@/components/pdp/ShareButton";
import { SelectionProvider } from "@/components/pdp/selection";

/* Rendered per request, never prerendered.

   Prices are converted for the shopper — shillings at home, dollars abroad —
   so one cached copy of this page would hand whichever currency it was built
   with to everyone who asked for it afterwards. A product page that quotes the
   wrong currency is worse than one that takes a moment longer.

   It also has to be dynamic to be renderable at all: the root layout reads the
   country cookie, and a statically generated route cannot read a cookie —
   which is exactly how this page started answering 500 in production while
   working perfectly in development.
*/
export const dynamic = "force-dynamic";

/* A product's own card: its picture, and its price at the front of the
   description, because a preview has nowhere else to put a price. See
   `shareCard` for what the three tags are doing. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found" };

  const settings = await getStoreSettings();
  // The store's base currency, deliberately, not the shopper's. A link preview
  // is generated once and cached by whoever scrapes it, then shown to everyone
  // the link is forwarded to — there is no one shopper to convert for, and a
  // card that guessed would be wrong for most of the people who see it.
  const currency = { symbol: settings.currency_symbol, locale: settings.locale };
  // "From" only where a product is sold in options that differ in price —
  // otherwise it is a lie about a single price, the same rule the card follows.
  const amount = p.priceFrom ?? p.price;
  const price = `${p.priceFrom != null ? "From " : ""}${formatMoney(amount, currency)}`;

  const summary = (p.shortDescription || p.description || "").trim();
  // Price first: a preview gets about two lines, and the price is the part
  // being shared.
  const description = summary ? `${price} · ${summary}` : price;

  const image = publicMediaUrl(p.images?.[0]?.url);

  return {
    title: p.title,
    description,
    ...shareCard({
      title: p.title,
      description,
      siteName: settings.business_name,
      image,
    }),
  };
}

function weight(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toLocaleString()} kg` : `${grams} g`;
}

/* The "Additional Information" table. Only rows the catalogue can actually
   fill — tags, brand and weight are optional, and a "Brand: —" row says
   nothing at all. */
function specs(p: Product, categoryName: string): { label: string; value: string }[] {
  const options = (p.variants ?? []).map((v) => v.label).join(", ");
  return [
    { label: "Category", value: categoryName },
    ...(p.brandName ? [{ label: "Brand", value: p.brandName }] : []),
    ...(options ? [{ label: p.variantOption || "Options", value: options }] : []),
    ...(p.sku ? [{ label: "SKU", value: p.sku }] : []),
    ...(p.weightGrams ? [{ label: "Weight", value: weight(p.weightGrams) }] : []),
    ...(p.tags?.length ? [{ label: "Tags", value: p.tags.join(", ") }] : []),
    { label: "Availability", value: stockStatus(p).label },
  ];
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  // The category came from the six-item demo list, so every real category
  // resolved to undefined and the breadcrumb, the image chip and the
  // "All <category>" link silently vanished from every product page.
  const [related, reviews, categories] = await Promise.all([
    getRelatedProducts(p, 4),
    getReviews(slug),
    getCategories()
  ]);
  const cat = categories.find((c) => c.slug === p.category);

  const ratingsCount = p.reviewCount ?? reviews.length;
  const productSpecs = specs(p, cat?.name ?? p.category);
  const galleryImages = p.images?.length ? p.images : [{ url: p.image, alt: p.title }];
  // The summary line only when it adds something: the importer often copied
  // the short description into the long one.
  const summary = p.shortDescription && p.shortDescription !== p.description ? p.shortDescription : "";

  return (
    <article className="bg-bg text-ink">
      <div className="container-store pt-4 pb-2">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            ...(cat ? [{ label: cat.name, href: `/shop/${cat.slug}` }] : []),
            { label: p.title },
          ]}
        />
      </div>

      <SelectionProvider product={p}>
        <section className="container-store py-4">
          {/* One white card, laid out like the reference: gallery | detail on
              top, the information tabs under them, and the offers and
              safe-checkout column down the right. On a phone it stacks in that
              order with the offers before the tabs, so a shopper who has
              decided does not scroll past the description to see them. */}
          <div className="rounded-2xl bg-surface p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_280px]">
              {/* Gallery | detail */}
              {/* 380px for the gallery leaves the detail column room for the
                  stepper, "Add to cart" and "Buy now" on one row beside the
                  280px offers column. */}
              <div className="order-1 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:col-start-1 xl:row-start-1">
                <div className="md:sticky md:top-4 md:self-start">
                  <ProductGallery
                    images={galleryImages}
                    title={p.title}
                    frameClassName={`rounded-2xl border-[6px] border-surface shadow-photo ${productTone(p.imageTone)}`}
                  >
                    {p.badge && (
                      <Pill
                        tone={p.badge === "sale" ? "danger" : p.badge === "hot" ? "accent" : "brand"}
                        size="xs"
                        className="absolute left-3 top-3 z-10"
                      >
                        {p.badgeLabel || p.badge}
                      </Pill>
                    )}
                  </ProductGallery>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                    {cat && (
                      <Link href={`/shop/${cat.slug}`}>
                        <Pill tone="brand" size="xs">{cat.name}</Pill>
                      </Link>
                    )}
                    {ratingsCount > 0 ? (
                      <a href="#reviews" className="inline-flex items-center gap-1.5 text-brand hover:underline">
                        <Stars value={p.rating} />
                        {ratingsCount.toLocaleString()} review{ratingsCount === 1 ? "" : "s"}
                      </a>
                    ) : (
                      <a href="#reviews" className="text-ink-muted hover:text-brand">
                        No reviews yet
                      </a>
                    )}
                  </div>

                  <h1 className="mt-3 font-display text-[24px] font-extrabold leading-[1.2] text-ink sm:text-[28px]">{p.title}</h1>
                  {summary && <p className="mt-2 line-clamp-2 text-[13.5px] text-ink-muted">{summary}</p>}

                  <div className="mt-4">
                    <PurchasePanel />
                  </div>

                  <dl className="mt-6 space-y-2 text-[13px]">
                    {p.sku && (
                      <div className="flex gap-1.5">
                        <dt className="font-semibold text-ink">SKU:</dt>
                        <dd className="text-ink-muted">{p.sku}</dd>
                      </div>
                    )}
                    {cat && (
                      <div className="flex gap-1.5">
                        <dt className="font-semibold text-ink">Category:</dt>
                        <dd>
                          <Link href={`/shop/${cat.slug}`} className="text-ink-muted hover:text-brand">
                            {cat.name}
                          </Link>
                        </dd>
                      </div>
                    )}
                    {p.brandName && (
                      <div className="flex gap-1.5">
                        <dt className="font-semibold text-ink">Brand:</dt>
                        <dd>
                          <Link
                            href={`/shop?q=${encodeURIComponent(p.brandName)}`}
                            className="text-ink-muted hover:text-brand"
                          >
                            {p.brandName}
                          </Link>
                        </dd>
                      </div>
                    )}
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex gap-1.5">
                        <dt className="font-semibold text-ink">Tags:</dt>
                        <dd className="text-ink-muted">{p.tags.join(", ")}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-5 flex flex-wrap items-center gap-6">
                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
                      <WishlistButton
                        productId={p.productId}
                        size={15}
                        className="h-9 w-9 rounded-full bg-blob"
                      />
                      Add to wishlist
                    </span>
                    <ShareButton title={p.title} />
                  </div>
                </div>
              </div>

              {/* Offers and safe checkout */}
              <aside className="order-2 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:sticky xl:top-4 xl:self-start">
                <CheckoutAside />
              </aside>

              {/* The information tabs */}
              <div className="order-3 xl:col-start-1 xl:row-start-2">
                <ProductTabs
                  tabs={[
                    {
                      id: "details",
                      label: "Product Details",
                      content: p.description ? (
                        <p className="max-w-prose whitespace-pre-line text-[14px] leading-relaxed text-ink-muted">
                          {p.description}
                        </p>
                      ) : (
                        <p className="text-[14px] text-ink-muted">No description for this product yet.</p>
                      ),
                    },
                    {
                      id: "information",
                      label: "Additional Information",
                      content: (
                        <table className="w-full max-w-2xl border-collapse text-[13.5px]">
                          <tbody>
                            {productSpecs.map((spec) => (
                              <tr key={spec.label} className="border-b border-line/10 last:border-0">
                                <th scope="row" className="w-40 py-2.5 pr-4 text-left align-top font-semibold text-ink">
                                  {spec.label}
                                </th>
                                <td className="py-2.5 text-ink-muted">{spec.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ),
                    },
                    {
                      id: "reviews",
                      label: `Customer Reviews (${String(ratingsCount).padStart(2, "0")})`,
                      content: (
                        <Reviews slug={slug} initialReviews={reviews} total={p.reviewCount} average={p.rating} />
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Videos ───────────────────────────────────────── */}
        <ProductVideos videos={p.videos || []} />

        {/* ── Ask a question ───────────────────────────────── */}
        <AskAboutProduct slug={slug} name={p.title} />

        {/* ── Frequently bought together ───────────────────── */}
        <section className="container-store pb-4">
          <RecommendationShelf productIds={[p.productId]} title="Customers also bought" />
        </section>

        {/* Sticky mobile-only buy bar — keeps Add/Buy one tap away while
            scrolling, on the same selection as the panel above. */}
        <MobileBuyBar />
      </SelectionProvider>

      {/* ── You might also like ──────────────────────────── */}
      {related.length > 0 && (
        <section className="container-store py-6 border-t border-line/5">
          <SectionHeader
            title="You might also like"
            action={cat ? { href: `/shop/${cat.slug}`, label: `All ${cat.name.toLowerCase()}` } : undefined}
          />
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
