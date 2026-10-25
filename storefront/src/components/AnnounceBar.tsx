"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { useStoreSettings } from "@/lib/store-context";
import { money } from "@/lib/format";
import { shippingTerms } from "@/lib/shipping";

// Long enough to read the line twice; the bar pauses while hovered.
const ROTATE_MS = 6000;
const COUNT_MS = 1200;

/* A number in braces marks a celebration — "Celebrating {48} years of Ketepa"
   — and is the one that counts up. Only the first pair is read. */
const MILESTONE = /\{(\d{1,4})\}/;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Counts 0 → [to] with an ease-out, so the last few years tick in slowly. */
function CountUp({ to }: { to: number }) {
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);

  return (
    <span
      className="inline-block text-center font-extrabold text-accent tabular-nums animate-announce-pop"
      // Wide enough for the final number, so the words around it hold still.
      style={{ minWidth: `${String(to).length}ch` }}
    >
      {value}
    </span>
  );
}

function Celebration({ text }: { text: string }) {
  const match = MILESTONE.exec(text);
  if (!match) return <>{text}</>;
  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);
  return (
    <>
      <span className="sr-only">{`${before}${match[1]}${after}`}</span>
      <span aria-hidden className="inline-flex items-center gap-1.5">
        <Sparkles size={13} className="text-accent animate-twinkle" />
        <span className="font-semibold text-white">
          {before}
          <CountUp to={Number(match[1])} />
          {after}
        </span>
      </span>
    </>
  );
}

export default function AnnounceBar() {
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const settings = useStoreSettings();
  const threshold = shippingTerms(settings).threshold;
  const fallback =
    threshold > 0 ? `Free delivery on orders over ${money(threshold)}` : `Welcome to ${settings.business_name}`;
  const announcement = settings.announcement?.trim() || "";

  // A celebration alternates with the everyday line rather than replacing it,
  // so the delivery offer is still one rotation away.
  const celebrating = MILESTONE.test(announcement);
  const lines = celebrating ? [announcement, fallback] : [announcement || fallback];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (lines.length < 2 || paused || prefersReducedMotion()) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % lines.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [lines.length, paused]);

  const line = lines[index % lines.length];

  return (
    <div className="bg-brand text-white/90 text-xs">
      <div className="container-store flex items-center justify-between py-2.5">
        <span
          className="relative overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Keyed by position, so each rotation remounts the line and replays
              its entrance — and the count starts again from zero. */}
          <span key={index} className={`inline-flex items-center ${lines.length > 1 ? "animate-announce-in" : ""}`}>
            <Celebration text={line} />
          </span>
        </span>
        <div className="hidden sm:flex items-center gap-4">
          {/* Demo: the other half of the platform, one click away. */}
          {process.env.NEXT_PUBLIC_ADMIN_URL && (
            <a href={process.env.NEXT_PUBLIC_ADMIN_URL} className="font-semibold hover:underline">Admin demo</a>
          )}
          <Link href="/track" className="hover:underline">Track order</Link>
          <Link href="/contact" className="hover:underline">Help</Link>
          {hydrated && user ? (
            <Link href="/account" className="inline-flex items-center gap-1.5 hover:underline">
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface/15 text-[10px] font-semibold text-white"
              >
                {user.initials}
              </span>
              <span>Hi, {firstName}</span>
            </Link>
          ) : (
            <Link href="/signin" className="hover:underline">Sign in</Link>
          )}
        </div>
      </div>
    </div>
  );
}
