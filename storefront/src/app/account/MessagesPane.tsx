"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, ChevronRight, MessageSquare, Package, Plus, Send } from "lucide-react";
import {
  getThread,
  getThreads,
  markThreadRead,
  replyToThread,
  startThread,
  type ReplyOrderCard,
  type SupportMessage,
  type SupportThread,
} from "@/lib/support-api";
import EmptyState from "@/components/ui/EmptyState";

/* The customer's side of the admin's /inbox. Same conversations, mirrored:
   here the shopper's own messages sit on the right and the store's on the
   left, which is the way round every messaging app has trained people to
   read. Threads are support tickets, so a reply lands straight in the inbox
   staff already work. */

const STATUS_LABEL: Record<SupportThread["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function shortTime(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** The opening message plus every reply, in one list the thread can render. */
function messagesOf(thread: SupportThread): SupportMessage[] {
  return [
    {
      id: 0,
      author: "",
      is_staff: false,
      author_kind: "customer",
      body: thread.message,
      created_at: thread.created_at,
    },
    ...thread.replies,
  ];
}

export default function MessagesPane() {
  const [threads, setThreads] = useState<SupportThread[] | null>(null);
  const [active, setActive] = useState<SupportThread | null>(null);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setThreads(await getThreads());
    } catch {
      setThreads([]);
      setError("Could not load your messages.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(thread: SupportThread) {
    setActive(thread);
    setComposing(false);
    // Opening it is reading it — clear the badge, then refresh the list so the
    // count on the account hub agrees with what's on screen.
    try {
      const fresh = await markThreadRead(thread.reference);
      setActive(fresh);
      void load();
    } catch {
      /* Reading is not worth an error message; the thread is already shown. */
    }
  }

  if (threads === null) {
    return <div className="py-10 text-center text-[13.5px] text-ink-muted">Loading your messages…</div>;
  }

  if (composing) {
    return (
      <NewThread
        onCancel={() => setComposing(false)}
        onStarted={async (thread) => {
          setComposing(false);
          setActive(thread);
          await load();
        }}
      />
    );
  }

  if (active) {
    return (
      <Thread
        thread={active}
        onBack={() => {
          setActive(null);
          void load();
        }}
        onChanged={(t) => {
          setActive(t);
          void load();
        }}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {error && <p className="text-[13px] text-danger">{error}</p>}

      <button
        type="button"
        onClick={() => setComposing(true)}
        className="flex items-center gap-2 self-start rounded-full bg-brand px-4 py-2 text-[13.5px] font-semibold text-on-brand transition-opacity hover:opacity-90"
      >
        <Plus size={16} />
        New message
      </button>

      {threads.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={26} />}
          title="No messages yet"
          description="Start a conversation and we'll reply here."
        />
      ) : (
        <ul className="grid gap-3">
          {threads.map((t) => {
            const last = t.replies[t.replies.length - 1];
            const preview = last ? (last.is_staff ? last.body : `You: ${last.body}`) : t.message;
            return (
              <li key={t.reference}>
                <button
                  type="button"
                  onClick={() => void open(t)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-brand/30"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-dark">
                    <MessageSquare size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14.5px] font-semibold text-ink">{t.subject}</span>
                      <span className="shrink-0 text-[12px] text-ink-muted">{shortTime(t.last_message_at)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] text-ink-muted">{preview}</span>
                      {t.unread_count > 0 && (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-on-brand">
                          {t.unread_count}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[11.5px] text-ink-muted">
                      {t.reference} · {STATUS_LABEL[t.status]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* Three dots, staggered. Deliberately shaped like an incoming message rather
   than a status line: it occupies the space the reply will land in, so the
   thread does not jump when it arrives. */
/* The orders the assistant is asking between.
 *
 * It used to spell this out in the message body with markdown bullets, which
 * arrive in a chat bubble as literal asterisks. Tapping one answers the
 * question in the customer's own words, so they never type an order number
 * either. */
function OrderChoices({
  orders,
  onPick,
}: {
  orders: ReplyOrderCard[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="mt-2 grid gap-1.5">
      {orders.map((o) => (
        <button
          key={o.number}
          type="button"
          onClick={() => onPick(`The ${o.title}`)}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-brand/40 hover:bg-brand-50/40"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-dark">
            <Package size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-ink">{o.title}</span>
            <span className="block text-[11.5px] text-ink-muted">
              {new Date(o.placed_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              {" · "}
              {o.status.replace(/_/g, " ")}
            </span>
          </span>
          <ChevronRight size={15} className="shrink-0 text-ink-muted" />
        </button>
      ))}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="mr-auto flex max-w-[85%] flex-col items-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-brand-50 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-brand-dark/50 motion-safe:animate-[typing_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
      <span className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-muted">
        <Bot size={11} aria-hidden />
        Assistant is typing…
      </span>
    </div>
  );
}

function Thread({
  thread,
  onBack,
  onChanged,
}: {
  thread: SupportThread;
  onBack: () => void;
  onChanged: (t: SupportThread) => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = messagesOf(thread);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [thread, thread.assistant_pending]);

  /* Polling only — this stack has no websockets, and the push notification
     covers the case that matters. Two speeds though: while the assistant is
     composing, the customer is watching typing dots and fifteen seconds of them
     is its own kind of broken. */
  useEffect(() => {
    const waiting = thread.assistant_pending;
    const id = setInterval(async () => {
      try {
        const fresh = await getThread(thread.reference);
        if (
          fresh.replies.length !== thread.replies.length ||
          fresh.assistant_pending !== thread.assistant_pending
        ) {
          onChanged(fresh);
        }
      } catch {
        /* A dropped poll is not worth telling anyone about. */
      }
    }, waiting ? 1500 : 15000);
    return () => clearInterval(id);
  }, [thread, onChanged]);

  async function send(text?: string) {
    const body = (text ?? draft).trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      onChanged(await replyToThread(thread.reference, body));
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} />
        All messages
      </button>

      <div className="rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <p className="text-[14.5px] font-semibold text-ink">{thread.subject}</p>
          <p className="text-[12px] text-ink-muted">
            {thread.reference} · {STATUS_LABEL[thread.status]}
          </p>
        </div>

        {/* Pinned above the messages, not scrolling with them: on a long thread
            the subject leaves the screen and both sides need to stay sure which
            item is being discussed. */}
        {thread.product && (
          <Link
            href={`/product/${thread.product.slug}`}
            className="flex items-center gap-3 border-b border-line bg-surface-alt px-4 py-2.5 hover:bg-line/5"
          >
            {thread.product.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thread.product.image}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
            )}
            <span className="truncate text-[13px] font-medium text-ink">
              {thread.product.name}
            </span>
          </Link>
        )}

        <div className="grid max-h-[440px] gap-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div
              key={`${m.id}-${m.created_at}`}
              className={`flex max-w-[85%] flex-col ${m.is_staff ? "mr-auto items-start" : "ml-auto items-end"} motion-safe:animate-[msg-in_180ms_ease-out]`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  m.is_staff
                    ? "rounded-bl-sm bg-brand-50 text-ink"
                    : "rounded-br-sm bg-brand text-on-brand"
                }`}
              >
                {m.body}
              </div>
              {m.orders && m.orders.length > 0 && (
                <OrderChoices orders={m.orders} onPick={(t) => void send(t)} />
              )}
              <span className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-muted">
                {m.author_kind === "ai" && <Bot size={11} aria-hidden />}
                {m.is_staff && m.author ? `${m.author} · ` : ""}
                {clockTime(m.created_at)}
              </span>
            </div>
          ))}

          {/* Something is coming. Without this the send lands and the thread
              simply sits there for a few seconds, which reads as ignored. */}
          {thread.assistant_pending && <TypingBubble />}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line p-3">
          {error && <p className="mb-2 text-[12.5px] text-danger">{error}</p>}
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
              placeholder="Type a message"
              className="h-11 flex-1 rounded-full border border-line bg-bg px-4 text-[13.5px] text-ink outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewThread({
  onCancel,
  onStarted,
}: {
  onCancel: () => void;
  onStarted: (thread: SupportThread) => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* One box. This used to ask for a subject and an order number before it would
     take a message — a form standing between someone and "where's my order",
     collecting two things they either do not know or should not have to look
     up. The thread takes its title from the message itself, and the assistant
     can already see every order on the account. */

  async function submit() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      onStarted(await startThread({ message: message.trim() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start that conversation.");
      setSending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} />
        All messages
      </button>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-dark">
            <MessageSquare size={17} />
          </span>
          <div>
            <p className="text-[14.5px] font-semibold text-ink">New message</p>
            <p className="text-[12px] text-ink-muted">We usually reply in a few seconds.</p>
          </div>
        </div>

        <div className="p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={4}
            autoFocus
            aria-label="Message"
            placeholder="Type your message…"
            className="w-full resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-brand"
          />
          {error && <p className="mt-2 text-[12.5px] text-danger">{error}</p>}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[12px] text-ink-muted">Enter to send</p>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={sending || !message.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[13.5px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={15} />
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
