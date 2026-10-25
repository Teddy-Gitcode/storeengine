import { resolveImageHosts, toRemotePatterns } from "./image-hosts.mjs";

/* Which hosts may be optimised is decided in one place — see image-hosts.mjs
   for why the previous `hostname: "**"` could not stay once the optimizer was
   switched on. The resolved list is published back into the bundle so the
   runtime helper (src/lib/images.ts) tests the same list the build enforced. */
const imageHosts = resolveImageHosts();

/* Where /media/ is proxied from. The optimizer runs inside this container and
   resolves `backend`; a browser does not. Preferring the internal origin here
   is what lets one relative path work in both places — see `mediaSrc`. */
function mediaUpstream(env = process.env) {
  // Demo build: /media/ is copied into public/, and the API host doesn't exist.
  if (env.NEXT_PUBLIC_API_BASE_URL?.includes(".invalid")) return "";
  for (const api of [env.INTERNAL_API_BASE_URL, env.NEXT_PUBLIC_API_BASE_URL]) {
    if (!api) continue;
    try {
      return new URL(api).origin;
    } catch {
      // Malformed base URL: try the next one, and fall through to no rewrite,
      // which leaves /media/ to whatever is in front of this app.
    }
  }
  return "";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Same escape hatch apps/admin has: a verification build must not write into
  // the `.next/` a running `next dev` is serving from — both write there and
  // the dev server's runtime chunks get clobbered. Set NEXT_DIST_DIR=.next-check
  // to build somewhere else. (It also rescues a `.next/` left root-owned by a
  // container build, which is otherwise unwritable from the host.)
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  env: {
    NEXT_PUBLIC_OPTIMIZED_IMAGE_HOSTS: imageHosts.join(","),
  },
  images: {
    /* Optimisation was off, so every <Image> served its original file: a 900px
       product photo into a 220px grid card, a 1200px one into a 56px gallery
       thumbnail. The `sizes` prop each of those call sites already carries was
       dead weight — Next can only act on it through the optimizer. On the demo
       catalogue that is ~11.6 MB of originals for one shop page, enough to
       stall a renderer. */
    remotePatterns: toRemotePatterns(imageHosts),
    // AVIF first, WebP for anything that cannot take it; Next picks per the
    // request's Accept header and falls back to the original format.
    formats: ["image/avif", "image/webp"],
    // Product photography is replaced by re-upload, which changes the URL, so
    // a derivative stays valid as long as the cache will hold it.
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
  /* Uploads are served through this origin rather than linked at Django's.
     A stored URL names one host and there is no host that is right for
     everybody who has to fetch it: `localhost:8000` is the browser's answer
     and `backend:8000` is the optimizer's, and each is unreachable from where
     the other one runs. A path has no host, so it needs no answer — this
     rewrite is what makes /media/ resolve wherever the request came from. */
  async rewrites() {
    const upstream = mediaUpstream();
    return upstream ? [{ source: "/media/:path*", destination: `${upstream}/media/:path*` }] : [];
  },
};

export default nextConfig;
