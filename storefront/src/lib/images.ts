/* Whether a given image URL is one the optimizer will accept.
 *
 * The optimizer only fetches from the hosts listed in `images.remotePatterns`
 * (built in image-hosts.mjs, and deliberately narrow — that endpoint fetches
 * on our behalf and serves from our origin). A src outside that list makes
 * `/_next/image` return 400, and the picture simply does not appear.
 *
 * Most images cannot hit that: everything the merchant uploads is served by
 * Django from the API host, which is always on the list. The exception is
 * anywhere the admin takes a pasted URL — hero slides, whose `image_url` is a
 * free-text CharField offering "Cloudinary etc." — so a merchant can point a
 * slide at a host this deployment never declared.
 *
 * Rather than let that 400, the caller marks that one image `unoptimized`,
 * which renders it as a plain pass-through: no optimizer, no allowlist, no
 * proxying. That is precisely what every image on the site did before, so the
 * worst case is the behaviour we are replacing — never a missing hero.
 *
 * The host list arrives via next.config's `env`, so it is the same list the
 * build enforced rather than a second copy that can drift out of step.
 *
 * SVG is refused for a different reason. Next's optimizer rejects `image/svg+xml`
 * outright unless `dangerouslyAllowSVG` is set — a 400, not a fallback — and the
 * placeholder every imageless product lands on (`/products/placeholder-1.svg`)
 * is exactly that. Turning the flag on would let a raster pipeline chew on a
 * vector for no gain and hand remote SVG (which can carry script) an origin it
 * should not have. Passing them through is both safer and better output. */

const ALLOWED: ReadonlySet<string> = new Set(
  (process.env.NEXT_PUBLIC_OPTIMIZED_IMAGE_HOSTS || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
);

export function canOptimizeImage(src: string | null | undefined): boolean {
  if (!src) return true;

  // Already vector. Nothing a raster optimizer does to this is an improvement,
  // and it would 400 rather than degrade.
  if (/\.svgz?(?:[?#]|$)/i.test(src)) return false;

  // Relative paths ("/hero/banner.jpg") are our own /public, always optimisable
  // and never subject to remotePatterns in the first place.
  if (src.startsWith("/")) return true;

  // A data: or blob: URI carries its own bytes; there is no host to allow.
  if (!/^https?:\/\//i.test(src)) return false;

  try {
    return ALLOWED.has(new URL(src).host);
  } catch {
    // Unparseable src: let it through unoptimised rather than gamble on a 400.
    return false;
  }
}

/* Re-home a stored media URL onto this origin.
 *
 * Most image URLs are computed per request. A few are not: the branding fields
 * on StoreSettings and a hero slide's image_url are free-text columns, so
 * whatever absolute URL was saved is what every visitor gets, forever —
 * `http://localhost:8000/media/brand/logo.png` if that is where the admin
 * happened to be pointed when it was uploaded. And Django stamps the rest with
 * DJANGO_MEDIA_URL or the host the request arrived on, which is `backend:8000`
 * for anything fetched during SSR and `localhost:8000` for anything the
 * browser asked for itself.
 *
 * So the same picture arrives under two hostnames, and neither one works
 * everywhere it is needed. `localhost:8000` is the browser's answer: from a
 * phone on the same network it resolves to the phone, and from inside this
 * container it is refused, which is a 500 out of /_next/image and no picture
 * at all. `backend:8000` is the optimizer's answer, and a browser cannot
 * resolve it — fine while every such image is proxied, and a broken image the
 * moment one is not (an SVG logo, say, which the optimizer refuses outright).
 *
 * A path names no host, so it has neither problem: /media/... resolves against
 * whoever served the page, and next.config's rewrite forwards it to Django
 * from wherever the asking happens. So a URL whose path starts with /media/ is
 * this store's own upload wherever its host claims to be, and is reduced to
 * that path. Anything else — a Cloudinary or CDN address a merchant pasted in
 * — is left exactly as written, because that one really does live somewhere
 * else.
 */
export function mediaSrc<T extends string | null | undefined>(src: T): T {
  if (!src) return src;
  // Already a path: our own /public, or something we have been through.
  if (src.startsWith("/")) return src;

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return src;
  }
  if (!parsed.pathname.startsWith("/media/")) return src;
  return `${parsed.pathname}${parsed.search}` as T;
}

/* The absolute form of the same URL, for the one place a path cannot go.
 *
 * og:image and twitter:image are read by crawlers that never load this page
 * and have no origin to resolve against, so those two need a whole URL. Next
 * would otherwise resolve a path against `metadataBase`, which this app does
 * not set — and its fallback is localhost, stamped into a tag whose entire
 * audience is somewhere else.
 *
 * The API's public origin, because that is where /media/ is actually served
 * and it is what these tags carried before they were reduced to paths. */
const PUBLIC_MEDIA_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api").origin;
  } catch {
    return "";
  }
})();

export function publicMediaUrl(src: string | null | undefined): string {
  if (!src) return "";
  // A merchant's own CDN address: already absolute, already reachable.
  if (!src.startsWith("/")) return src;
  return PUBLIC_MEDIA_ORIGIN ? `${PUBLIC_MEDIA_ORIGIN}${src}` : src;
}
