"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
export const googleEnabled = Boolean(GOOGLE_CLIENT_ID);

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGsi(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.google?.accounts?.id) return resolve(w.google);
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).google));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve((window as any).google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function isDark() {
  if (typeof document === "undefined") return false;
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr) return attr === "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/**
 * "Continue with Google" — renders Google's official Identity Services button.
 * On success it exchanges the ID token for our session and redirects to `next`.
 * Renders nothing when no client ID is configured.
 */
export default function GoogleSignInButton({ next = "/account" }: { next?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const loginWithGoogle = useAuth((s) => s.loginWithGoogle);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!googleEnabled || !holder.current) return;
    let cancelled = false;

    loadGsi()
      .then((google) => {
        if (cancelled || !holder.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp: any) => {
            try {
              await loginWithGoogle(resp.credential);
              router.push(next);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Google sign-in failed.");
            }
          },
        });
        const width = Math.min(400, Math.max(240, holder.current.clientWidth || 320));
        holder.current.innerHTML = "";
        google.accounts.id.renderButton(holder.current, {
          type: "standard",
          theme: isDark() ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "center",
          width,
        });
      })
      .catch(() => setError("Couldn't reach Google. Check your connection and retry."));

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, router, next]);

  if (!googleEnabled) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={holder} className="flex w-full justify-center" />
      {error && (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
