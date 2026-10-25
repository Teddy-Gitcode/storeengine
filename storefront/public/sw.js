/* Storefront service worker — browser notifications only.

   It caches nothing and intercepts no requests: its one job is to show a
   notification the store sends (a payment that failed, items about to be
   released) and to open the page it points at when tapped. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Update", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Update", {
      body: data.body || "",
      // One per order: a reminder replaces the failure notice, not stacks on it.
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/" },
      icon: "/icon.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      // Only ever this store's own pages: the path is kept, the origin is
      // always this one — which also covers a backend whose STOREFRONT_URL
      // says ketepa.com while the shopper is on www.ketepa.com.
      const given = new URL(url, self.location.origin);
      const target = new URL(given.pathname + given.search, self.location.origin);
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).pathname === target.pathname && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});
