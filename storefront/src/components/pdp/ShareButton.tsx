"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";

/* The phone's own share sheet where there is one (WhatsApp is the share target
   that matters here); copying the link everywhere else. */
export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Closing the sheet rejects; nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure origin, permissions) — leave the label.
    }
  }

  return (
    <button type="button" onClick={share} className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink hover:text-brand">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-blob">
        <Share2 size={15} aria-hidden />
      </span>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
