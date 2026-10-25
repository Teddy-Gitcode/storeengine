// Client wrappers for the customer's support conversations. Everything goes
// through this app's /api/account/support/* handlers so the DRF token stays in
// an httpOnly cookie (same arrangement as orders-api.ts).
import { ApiError } from "@/lib/account-api";

/** An order offered as a card under an assistant message, for the customer to
    pick between. Re-read and re-scoped server-side, never trusted from the
    model's own output. */
export type ReplyOrderCard = {
  number: string;
  title: string;
  placed_at: string;
  status: string;
  total: string;
  currency: string;
  image: string;
};

export type SupportMessage = {
  id: number;
  /** The store's name on a staff reply — never an employee's login. */
  author: string;
  is_staff: boolean;
  /** `ai` is still the shop talking, but the bubble says which. */
  author_kind: "customer" | "staff" | "ai";
  body: string;
  /** Present when the assistant is asking which order they mean. */
  orders?: ReplyOrderCard[];
  created_at: string;
};

/** The product a thread is about, when it started from a product page. */
export type TicketProduct = {
  slug: string;
  name: string;
  price: string;
  image: string;
};

export type SupportThread = {
  reference: string;
  subject: string;
  /** The opening message. It lives on the ticket, not in `replies`. */
  message: string;
  order_number: string;
  /**
   * Null for an ordinary message, and also for a question about a product that
   * has since been delisted — the conversation outlives the listing.
   */
  product: TicketProduct | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  last_message_at: string;
  unread_count: number;
  /** The assistant is composing a reply right now — drives the typing dots. */
  assistant_pending: boolean;
  replies: SupportMessage[];
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError((data as { detail?: string }).detail || "Something went wrong.", response.status);
  }
  return data as T;
}

export function getThreads() {
  return request<{ results?: SupportThread[] } | SupportThread[]>("/api/account/support").then(
    (data) => (Array.isArray(data) ? data : data.results ?? []),
  );
}

export function getThread(reference: string) {
  return request<SupportThread>(`/api/account/support/${encodeURIComponent(reference)}`);
}

export function startThread(payload: {
  subject?: string;
  message: string;
  order_number?: string;
  /**
   * A product slug. The server names the subject after the product when one is
   * sent and no subject is, so staff can triage without opening every thread.
   */
  product?: string;
}) {
  return request<SupportThread>("/api/account/support", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function replyToThread(reference: string, body: string) {
  return request<SupportThread>(`/api/account/support/${encodeURIComponent(reference)}/reply`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function markThreadRead(reference: string) {
  return request<SupportThread>(`/api/account/support/${encodeURIComponent(reference)}/read`, {
    method: "POST",
    body: "{}",
  });
}

/** Total unread staff messages across every thread — for the account badge. */
export function unreadTotal(threads: SupportThread[]) {
  return threads.reduce((sum, t) => sum + t.unread_count, 0);
}
