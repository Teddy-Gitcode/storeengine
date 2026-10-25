/**
 * Which hosts the Next image optimizer is allowed to fetch from.
 *
 * This list is the security boundary on `/_next/image`. That endpoint takes a
 * URL and returns its bytes from our own origin, so whatever it accepts, this
 * site will fetch on a stranger's behalf and serve under our domain and our
 * bandwidth. A `hostname: "**"` entry — which is what stood here while the
 * optimizer was switched off — turns the shop into an open image proxy the
 * moment optimisation is enabled. Keep it narrow.
 *
 * Two things go in it:
 *
 *  - The store's own media host, derived from NEXT_PUBLIC_API_BASE_URL, because
 *    that is where Django serves everything the merchant uploads (products,
 *    categories, promo art). It is the overwhelming majority of images.
 *  - Anything the deployment declares in NEXT_PUBLIC_IMAGE_HOSTS, for a
 *    merchant who keeps creative on a CDN. Comma-separated, `host[:port]`,
 *    e.g. "res.cloudinary.com,cdn.shopify.com".
 *
 * A merchant can still paste a URL from a host nobody declared — hero slides
 * take free text (StorefrontSlide.image_url is a CharField). Those are not an
 * error: `canOptimizeImage` in src/lib/images.ts spots them and renders that
 * one image unoptimised, which is a pass-through and exactly what the whole
 * site did before. Undeclared hosts lose optimisation, never the picture.
 *
 * Shared by next.config.mjs and, through the resolved list it publishes as
 * NEXT_PUBLIC_OPTIMIZED_IMAGE_HOSTS, by the runtime helper — so the build and
 * the browser can never disagree about what is allowed.
 */

/** The local Django dev server, which serves /media/ in DEBUG. */
const DEV_HOSTS = ["localhost:8000", "127.0.0.1:8000"];

/**
 * Resolve the allowed hosts as `host[:port]` strings.
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function resolveImageHosts(env = process.env) {
  const hosts = new Set(DEV_HOSTS);

  // Wherever the API lives, its /media/ lives beside it. Both addresses count:
  // under Docker the browser is told http://localhost:8000 while Django, which
  // builds absolute media URLs from the host a request arrived on, stamps them
  // http://backend:8000 for anything fetched during SSR.
  //
  // These entries are a safety net rather than the load-bearing path. Uploads
  // now reach the page as /media/... and are proxied by next.config's rewrite
  // (see `mediaSrc`), precisely because neither hostname is reachable from
  // everywhere the picture has to be fetched. What these still cover is a URL
  // that arrives absolute and is left that way — an API response shape nobody
  // has routed through `mediaSrc` yet.
  for (const api of [env.NEXT_PUBLIC_API_BASE_URL, env.INTERNAL_API_BASE_URL]) {
    if (!api) continue;
    try {
      hosts.add(new URL(api).host);
    } catch {
      // A malformed base URL is the API client's problem to report, not ours;
      // dropping it here just means those images go unoptimised.
    }
  }

  for (const entry of (env.NEXT_PUBLIC_IMAGE_HOSTS || "").split(",")) {
    const host = entry.trim();
    // No wildcards: "**" here would reopen the hole this file exists to close.
    if (host && !host.includes("*") && !host.includes("/")) hosts.add(host);
  }

  return [...hosts];
}

/**
 * Turn those into `images.remotePatterns` entries.
 *
 * Each host gets both schemes: which one applies is a deployment detail (the
 * dev backend is http, production is https), and a pattern that does not match
 * only ever costs the image its optimisation.
 *
 * @param {string[]} hosts
 */
export function toRemotePatterns(hosts) {
  return hosts.flatMap((entry) => {
    const [hostname, port = ""] = entry.split(":");
    return [
      { protocol: "https", hostname, port, pathname: "/**" },
      { protocol: "http", hostname, port, pathname: "/**" },
    ];
  });
}
