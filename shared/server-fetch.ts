/* Install the server-side fetch patch: requests to DEMO_API are answered by
 * demo-api.ts, everything else goes out as normal. Called from
 * instrumentation.ts (runtime) and imported by the root layout, because
 * `next build` prerenders pages without running instrumentation. */
import { demoApi, isDemoApi } from "./demo-api";

const FLAG = Symbol.for("storeengine.demoFetch");

export function installDemoFetch() {
  const g = globalThis as typeof globalThis & { [FLAG]?: boolean };
  if (g[FLAG]) return;
  g[FLAG] = true;
  const network = globalThis.fetch;

  globalThis.fetch = async function demoFetch(input: RequestInfo | URL, init?: RequestInit) {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!isDemoApi(href)) return network(input, init);
    const request = new Request(href, input instanceof Request ? input : init);
    const body = request.method === "GET" || request.method === "HEAD" ? null : await request.text();
    return demoApi(request.method, href, request.headers, body);
  } as typeof fetch;
}

installDemoFetch();
