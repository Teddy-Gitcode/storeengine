/* Where the apps think the API is. Nothing answers at this address: the
   server-side fetch patch (instrumentation.ts) and the browser-side one
   (instrumentation-client.ts) catch every request to it first. Kept apart
   from demo-api.ts so the browser bundle never pulls in the fixtures. */
export const DEMO_API = "https://demo-api.storeengine.invalid/api";

/** Same-origin route the browser's requests are sent to instead. */
export const DEMO_ROUTE = "/demo-api";

export function isDemoApi(href: string) {
  return href.startsWith(DEMO_API);
}
