"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, ChevronRight, Hand, MessageSquare, Package, Send, Sparkles, SquarePen, X } from "lucide-react";
import { useAssistant, productSuggestions, type AssistantContext } from "@/lib/assistant-store";
import { useAuth } from "@/lib/auth-store";
import {
  getThread,
  getThreads,
  replyToThread,
  startThread,
  type ReplyOrderCard,
  type SupportThread,
} from "@/lib/support-api";

/* A launcher that follows the shopper around, rather than a conversation
   filed under Account → Messages.
 *
 * The questions this answers — "is this in stock", "where's my order", "what's
 * the return window" — get asked *while browsing*, and a chat you have to
 * navigate away from the product to reach is a chat nobody opens. It sits above
 * the mobile bottom bar so it never covers the nav.
 *
 * Follow-ups like "and the other one?" only work if a conversation continues,
 * so the panel does continue one — but only the one the shopper is plausibly
 * still in. See `pickThread`. */

const PANEL_ID = "assistant-panel";

/** How long a conversation stays the one you are "in". */
const CONTINUE_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Which conversation the panel continues, if any.
 *
 * It used to be `threads[0]` — the newest thread of any kind — which meant
 * opening the panel from a bag replayed whatever was last discussed (a staff
 * conversation, a question about another product) and then appended "is this in
 * stock?" to it, where "this" now meant two different things. The assistant
 * reads that history, so the wrong thread is a wrong answer, not just untidy.
 *
 * A thread is continued only when it is about the same thing the shopper is
 * looking at and is still warm. Everything else lives in Account → Messages,
 * which is the place for history; a panel opened from a product page is not.
 */
export function pickThread(
  threads: SupportThread[],
  context: AssistantContext,
): SupportThread | null {
  const now = Date.now();
  return (
    threads.find(
      (t) =>
        (t.status === "open" || t.status === "in_progress") &&
        now - new Date(t.last_message_at).getTime() < CONTINUE_WINDOW_MS &&
        // On a product page, only that product's thread continues. Off one, only
        // a general thread does — a bag conversation is not the answer to
        // "where's my order" asked from the homepage.
        (context ? t.product?.slug === context.slug : !t.product),
    ) ?? null
  );
}

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function AssistantLauncher() {
  const [available, setAvailable] = useState<{ enabled: boolean; name: string } | null>(null);
  const open = useAssistant((s) => s.open);
  const ask = useAssistant((s) => s.ask);
  const close = useAssistant((s) => s.close);

  // Ask once per load. A shop with no assistant must not render a bubble that
  // opens onto nothing.
  useEffect(() => {
    let alive = true;
    fetch("/api/assistant")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d?.enabled && setAvailable(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Escape closes, like every other dialog in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!available) return null;
  const name = available.name;

  return (
    <>
      {open && <AssistantPanel name={name} onClose={close} />}

      {/* Gone while the drawer is open: it sits on top of the composer, and the
          drawer already has a close in its header. Unmounted rather than given
          the `hidden` attribute — `hidden` is a UA `display:none`, which the
          `flex` class below outranks, so the button stayed visible over the
          panel's send button. */}
      {!open && (
      <button
        type="button"
        onClick={() => ask()}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        /* bottom-20 on small screens clears MobileBottomBar; lg:bottom-6 puts it
           back in the corner once that bar is gone. */
        className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 rounded-full bg-brand py-3 pl-4 pr-5 text-on-brand shadow-lg transition-transform hover:scale-[1.03] active:scale-95 lg:bottom-6 lg:right-6"
      >
        <Sparkles size={18} />
        <span className="text-[13.5px] font-semibold">Ask {name}</span>
      </button>
      )}
    </>
  );
}

function AssistantPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const user = useAuth((s) => s.user);
  const consumePending = useAssistant((s) => s.consumePending);
  /* The product the panel was opened from — read once, because browsing on to
     another item while the panel is open must not swap the conversation out
     from under a half-typed question. */
  const [context] = useState<AssistantContext>(() => useAssistant.getState().context);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  /* Continue the conversation this shopper is still in — if there is one. */
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let alive = true;
    getThreads()
      .then((list) => alive && setThread(pickThread(list, context)))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user, context]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [thread, thread?.assistant_pending]);

  // Fast while it is composing, idle otherwise — the same two speeds the full
  // thread view uses.
  useEffect(() => {
    if (!thread) return;
    const id = setInterval(async () => {
      try {
        const fresh = await getThread(thread.reference);
        if (
          fresh.replies.length !== thread.replies.length ||
          fresh.assistant_pending !== thread.assistant_pending
        ) {
          setThread(fresh);
        }
      } catch {
        /* a dropped poll is not worth reporting */
      }
    }, thread.assistant_pending ? 1500 : 15000);
    return () => clearInterval(id);
  }, [thread]);

  const send = useCallback(
    async (text?: string) => {
      const body = (text ?? draft).trim();
      if (!body || sending) return;
      setSending(true);
      setError(null);
      try {
        setThread(
          thread
            ? await replyToThread(thread.reference, body)
            : /* The slug is what lets the assistant resolve "this" and "it" —
                 without it the backend's product hint never fires and a
                 question asked from the page about the bag arrives naming
                 nothing. */
              await startThread({ message: body, product: context?.slug }),
        );
        setDraft("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not send that.");
      } finally {
        setSending(false);
      }
    },
    [draft, sending, thread, context],
  );

  /* A question handed over by the product page fires once the panel is ready —
     tapping a suggestion out there should send it, not merely open a box with
     it typed in. */
  useEffect(() => {
    if (loading) return;
    const q = consumePending();
    if (q) void send(q);
  }, [loading, consumePending, send]);

  const suggestions = context
    ? productSuggestions(context.name, false)
    : ["Where is my order?", "What deals are on today?", "How long does delivery take?"];

  const messages = thread
    ? [
        { id: 0, author: "", is_staff: false, author_kind: "customer" as const, body: thread.message, created_at: thread.created_at, orders: undefined },
        ...thread.replies,
      ]
    : [];

  return (
    <>
      {/* Dimming the page is what makes this read as a panel you are *in*
          rather than a tooltip floating over the shop. */}
      <button
        aria-label="Close assistant"
        onClick={onClose}
        className="fixed inset-0 z-[59] bg-black/25 motion-safe:animate-[msg-in_140ms_ease-out] lg:bg-black/10"
      />
      <div
        id={PANEL_ID}
        role="dialog"
        aria-modal="true"
        aria-label={`Ask ${name}`}
        className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl motion-safe:animate-[drawer-in_200ms_ease-out]"
      >
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-dark">
          <Bot size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">Ask {name}</p>
          {/* Says what this conversation is about, so a continued thread never
              looks like it wandered in from somewhere else. */}
          <p className="truncate text-[11.5px] text-ink-muted">
            {context ? `About the ${context.name}` : "Orders, products and deals"}
          </p>
        </div>
        {thread && (
          <button
            type="button"
            onClick={() => {
              setThread(null);
              setError(null);
            }}
            aria-label="Start a new chat"
            title="Start a new chat"
            className="rounded-full p-1 text-ink-muted hover:bg-line/10"
          >
            <SquarePen size={15} />
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-ink-muted hover:bg-line/10">
          <X size={16} />
        </button>
      </div>

      {!user ? (
        <div className="p-6 text-center">
          <MessageSquare size={22} className="mx-auto mb-3 text-ink-muted" />
          <p className="text-[13.5px] font-semibold text-ink">Sign in to chat</p>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            So we can look up your orders securely.
          </p>
          <Link
            href="/sign-in"
            onClick={onClose}
            className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-on-brand"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {loading ? (
              <p className="text-center text-[12.5px] text-ink-muted">Loading…</p>
            ) : messages.length === 0 ? (
              <div className="space-y-4">
                {/* Said once, up front. A shopper deciding whether to trust an
                    answer about stock or returns deserves to know what is
                    answering, before they act on it. */}
                <div className="rounded-xl border border-line bg-bg p-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    Hi{user?.name ? ` ${user.name.split(" ")[0]}` : ""}
                    <Hand size={14} className="text-accent-dark" aria-hidden />
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                    I can look up your orders, check what we have in stock and explain how
                    delivery and returns work. My answers come from this shop&apos;s own data,
                    but I&apos;m AI — if anything looks wrong, ask for a person.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                    Try asking
                  </p>
                  <div className="grid gap-1.5">
                    {suggestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void send(q)}
                        className="rounded-full border border-line px-3.5 py-2 text-left text-[12.5px] text-ink transition-colors hover:border-brand/40 hover:bg-brand-50/40"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={`${m.id}-${m.created_at}`}
                  className={`flex max-w-[88%] flex-col ${m.is_staff ? "mr-auto items-start" : "ml-auto items-end"} motion-safe:animate-[msg-in_180ms_ease-out]`}
                >
                  <div
                    className={`rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                      m.is_staff ? "rounded-bl-sm bg-brand-50 text-ink" : "rounded-br-sm bg-brand text-on-brand"
                    }`}
                  >
                    {m.body}
                  </div>
                  {m.orders && m.orders.length > 0 && (
                    <PanelOrderChoices orders={m.orders} onPick={(t) => void send(t)} />
                  )}
                  <span className="mt-0.5 text-[11px] text-ink-muted">{clockTime(m.created_at)}</span>
                </div>
              ))
            )}
            {thread?.assistant_pending && (
              <div className="mr-auto flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-brand-50 px-3 py-2.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-brand-dark/50 motion-safe:animate-[typing_1.2s_ease-in-out_infinite]"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line p-3">
            {error && <p className="mb-1.5 text-[12px] text-danger">{error}</p>}
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                aria-label="Message"
                placeholder="Ask anything…"
                className="h-10 flex-1 rounded-full border border-line bg-bg px-3.5 text-[13px] text-ink outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !draft.trim()}
                aria-label="Send"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-on-brand disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </>
  );
}

function PanelOrderChoices({
  orders,
  onPick,
}: {
  orders: ReplyOrderCard[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="mt-1.5 grid w-full gap-1">
      {orders.map((o) => (
        <button
          key={o.number}
          type="button"
          onClick={() => onPick(`The ${o.title}`)}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:border-brand/40"
        >
          <Package size={13} className="shrink-0 text-brand-dark" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{o.title}</span>
          <ChevronRight size={13} className="shrink-0 text-ink-muted" />
        </button>
      ))}
    </div>
  );
}
