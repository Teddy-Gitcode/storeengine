"use client";
import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import type { Review } from "@/lib/catalog-api";
import { useAuth } from "@/lib/auth-store";
import Stars from "@/components/Stars";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Pill from "@/components/ui/Pill";

export default function Reviews({
  slug,
  initialReviews,
  total,
  average: reportedAverage,
}: {
  slug: string;
  initialReviews: Review[];
  /** Approved-review count for the whole product, not just this first page. */
  total?: number;
  /** The catalogue's own average, for the same reason. */
  average?: number;
}) {
  const user = useAuth((s) => s.user);
  const [reviews] = useState(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only the first page of reviews is server-rendered, so the headline figures
  // come from the catalogue's own totals when it reports them.
  const count = total ?? reviews.length;
  const average = reportedAverage
    ? reportedAverage
    : reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, rating, title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Could not submit the review.");
      setSubmitted(true);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="text-[20px] font-semibold text-ink">Customer reviews</h2>
          {count > 0 && (
            <div className="mt-1 flex items-center gap-2 text-[13.5px] text-ink-muted">
              <Stars value={average} />
              <span className="font-semibold text-ink">{average.toFixed(1)}</span>
              <span>· {count.toLocaleString()} review{count === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
        {!submitted && !showForm && (
          user ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-md border border-line/15 px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
            >
              Write a review
            </button>
          ) : (
            <Link
              href={`/signin?next=${encodeURIComponent(`/product/${slug}`)}`}
              className="text-[13px] font-semibold text-brand hover:text-brand-dark"
            >
              Sign in to review
            </Link>
          )
        )}
      </div>

      {submitted && (
        <div className="mb-5 rounded-lg border border-brand/25 bg-brand-50/50 px-4 py-3 text-[13.5px] text-brand-dark">
          Thanks! Your review was submitted and will appear once approved.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-line/5 bg-surface p-5 grid gap-3.5 max-w-lg">
          <div>
            <span id="review-rating-label" className="text-[12.5px] font-semibold text-ink-muted block mb-1.5">
              Your rating
            </span>
            <div className="flex gap-1" role="radiogroup" aria-labelledby="review-rating-label">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={star === rating}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                  className={`rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    star <= rating ? "text-accent" : "text-black/15 hover:text-accent/60"
                  }`}
                >
                  <Star size={22} aria-hidden className={star <= rating ? "fill-current" : ""} />
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-ink-muted">Title (optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="soft-input px-3 py-2.5" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-ink-muted">Your review <span className="text-danger">*</span></span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4} className="soft-input px-3 py-2.5 resize-y" />
          </label>
          <p className="text-[12px] text-ink-faint">
            Your review is published publicly under your first name once a moderator approves it.
          </p>
          {error && <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] text-danger">{error}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 disabled:opacity-70">
              {busy ? "Submitting..." : "Submit review"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-line/15 px-4 py-2.5 text-[13px] font-semibold text-ink-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Be the first to share your experience with this product."
        />
      ) : (
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
          <Card padding="sm" className="self-start">
            {distribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 py-1 text-[12px] text-ink-muted">
                <span className="flex w-8 items-center gap-1 tabular-nums">
                  {star}
                  <Star size={11} className="fill-accent text-accent" aria-hidden />
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : 0 }}
                  />
                </div>
                <span className="w-6 text-right tabular-nums">{count}</span>
              </div>
            ))}
          </Card>
          <ul className="grid gap-3">
            {reviews.map((review) => (
              <Card as="li" key={review.id} padding="sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={review.rating} size={13} />
                  {review.title && <span className="text-[14px] font-semibold text-ink">{review.title}</span>}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{review.body}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-faint">
                  <span className="font-medium text-ink-muted">{review.display_name}</span>
                  <span>·</span>
                  <span>{new Date(review.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                  {review.is_verified_purchase && (
                    <Pill tone="brand" size="xs" className="gap-1">
                      <BadgeCheck size={11} /> Verified purchase
                    </Pill>
                  )}
                </div>
              </Card>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
