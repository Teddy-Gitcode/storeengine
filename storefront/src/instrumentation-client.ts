/* Demo: the browser can't reach DEMO_API either, so its requests go to this
 * app's own /demo-api route, which runs the same stand-in as the server. */
import { DEMO_API, DEMO_ROUTE, isDemoApi } from "./demo/demo-config";

const network = window.fetch.bind(window);

window.fetch = function demoFetch(input: RequestInfo | URL, init?: RequestInit) {
  const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!isDemoApi(href)) return network(input, init);
  const local = DEMO_ROUTE + href.slice(DEMO_API.length);
  return network(input instanceof Request ? new Request(local, input) : local, init);
} as typeof fetch;
