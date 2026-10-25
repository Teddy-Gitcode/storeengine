/* The API has two addresses, and which one is right depends on who is asking.
 *
 * Under Docker the Next server reaches Django at http://backend:8000 on the
 * compose network, but a browser cannot resolve "backend" at all — that name
 * exists only between containers. NEXT_PUBLIC_ variables are inlined into the
 * client bundle, so a single value shared by both sides is wrong for one of
 * them: point it at `backend` and every fetch made in the browser fails DNS,
 * point it at `localhost` and server-side rendering talks to the storefront
 * container instead of the API.
 *
 * So there are two. NEXT_PUBLIC_API_BASE_URL is the browser's, and must be a
 * host the shopper's machine can reach. INTERNAL_API_BASE_URL is the server's,
 * and is not NEXT_PUBLIC_ on purpose: Next replaces non-public variables with
 * undefined when it builds the client bundle, so this expression collapses to
 * the public URL in the browser and prefers the internal one on the server,
 * without either side needing to know which it is.
 *
 * Running natively, with no containers, neither is set and both sides want the
 * same localhost default.
 */
export const API_BASE =
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000/api";
