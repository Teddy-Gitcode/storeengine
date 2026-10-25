"use client";
import { API_BASE } from "./api-base";

/* Browser notifications over standard Web Push. The store's public VAPID key
   comes from the API; an empty key means the store hasn't set them up, and
   the page then never asks. */

export type WebPushState = "unsupported" | "off" | "denied" | "ask" | "on";

function supported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

let keyPromise: Promise<string> | null = null;

function publicKey(): Promise<string> {
  keyPromise ??= fetch(`${API_BASE}/storefront/push/web/key/`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { public_key: "" }))
    .then((d: { public_key?: string }) => d.public_key || "")
    .catch(() => "");
  return keyPromise;
}

function keyBytes(base64url: string): Uint8Array {
  const padded = base64url + "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function webPushState(): Promise<WebPushState> {
  if (!supported()) return "unsupported";
  if (!(await publicKey())) return "off";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (await registration?.pushManager.getSubscription()) return "on";
  }
  return "ask";
}

/** Ask, subscribe, and tie the subscription to [order] (with its pay token)
 *  so a guest is reminded about that order. Must run from a click: browsers
 *  refuse a permission prompt that nobody asked for. */
export async function enableWebPush(order?: { number: string; token?: string | null }): Promise<WebPushState> {
  if (!supported()) return "unsupported";
  const key = await publicKey();
  if (!key) return "off";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "ask";

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(key) as BufferSource,
    }));

  const response = await fetch("/api/push/web", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      ...(order ? { order: order.number, token: order.token || undefined } : {}),
    }),
  });
  return response.ok ? "on" : "ask";
}
