"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircleQuestion, Sparkles } from "lucide-react";
import { startThread } from "@/lib/support-api";
import { useAssistant, productSuggestions } from "@/lib/assistant-store";
import { useAuth } from "@/lib/auth-store";

/**
 * "Ask a question about this product" — sent as a support message, not posted
 * as public Q&A.
 *
 * The answer usually depends on who is asking (their size, their address, what
 * they already own), and a public thread cannot say any of that. It lands in
 * the same inbox staff already work, carrying the product so nobody has to
 * guess which item "does this fit a 12-year-old?" is about.
 */
export default function AskAboutProduct({
  slug,
  name,
  hasOptions = false,
}: {
  slug: string;
  name: string;
  /** Whether the product has colour/size variants, so the suggestions can
      offer "what sizes does it come in" only when there are any. */
  hasOptions?: boolean;
}) {
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const ask = useAssistant((s) => s.ask);
  const setContext = useAssistant((s) => s.setContext);
  const [assistant, setAssistant] = useState<{ enabled: boolean; name: string } | null>(null);

  /* Being on this page is the context, not clicking the pills. Opening the
     panel from the floating button while looking at a product should still know
     which product that is. */
  useEffect(() => {
    setContext({ slug, name });
    return () => setContext(null);
  }, [slug, name, setContext]);

  /* When this shop has an assistant, the question can be answered here and now
     rather than filed for staff to reply to later — so the block becomes a row
     of things worth asking, and tapping one opens the panel with it already
     sent. Shops without one keep the form below, which staff answer. */
  useEffect(() => {
    let alive = true;
    fetch("/api/assistant")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d?.enabled && setAssistant(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = message.trim();
    if (!body) {
      setError("Write your question first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const thread = await startThread({ message: body, product: slug });
      setReference(thread.reference);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (assistant) {
    const context = { slug, name };
    return (
      <section className="container-store pb-4">
        <div className="rounded-xl border border-line/10 bg-surface-alt p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="shrink-0 text-brand" />
            <h2 className="text-[15px] font-semibold text-ink">Ask {assistant.name}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {productSuggestions(name, hasOptions).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask({ question: q, context })}
                className="rounded-full border border-line/20 bg-surface px-3.5 py-2 text-[13px] text-ink transition-colors hover:border-brand/40 hover:bg-brand-50/40"
              >
                {q}
              </button>
            ))}
            <button
              type="button"
              onClick={() => ask({ context })}
              className="rounded-full bg-brand px-3.5 py-2 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90"
            >
              Ask something else
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container-store pb-4">
      <div className="rounded-xl border border-line/10 bg-surface-alt p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <MessageCircleQuestion size={20} className="mt-0.5 shrink-0 text-ink" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-ink">Still deciding?</h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Ask us anything about this product and we&apos;ll reply in your account.
            </p>

            {reference ? (
              <p className="mt-3 text-[13px] text-ink">
                Thanks — your question is with us.{" "}
                <Link
                  href={`/account?tab=messages`}
                  className="font-medium underline underline-offset-2"
                >
                  Follow it in Messages
                </Link>
                .
              </p>
            ) : /* Until zustand rehydrates, `user` is null and would wrongly
                  offer a sign-in link to someone already signed in. */
            !hydrated ? (
              <div className="mt-3 h-9 w-32 animate-pulse rounded-lg bg-line/10" />
            ) : !user ? (
              <Link
                href={`/signin?next=${encodeURIComponent(`/product/${slug}`)}`}
                className="btn-primary mt-3 inline-flex h-9 items-center px-4 text-[13px]"
              >
                Sign in to ask
              </Link>
            ) : open ? (
              <form onSubmit={handleSubmit} className="mt-3">
                <label htmlFor="ask" className="sr-only">
                  Your question about {name}
                </label>
                <textarea
                  id="ask"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={`What would you like to know about ${name}?`}
                  className="w-full rounded-lg border border-line/20 bg-surface p-3 text-[13px] text-ink outline-none focus:border-ink/40"
                />
                {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <button type="submit" disabled={busy} className="btn-primary h-9 px-4 text-[13px]">
                    {busy ? "Sending…" : "Send question"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-9 px-3 text-[13px] text-ink-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn-primary mt-3 h-9 px-4 text-[13px]"
              >
                Ask a question
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
