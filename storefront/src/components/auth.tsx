"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useStoreSettings } from "@/lib/store-context";

/**
 * Where to land after signing in. `next` arrives from the query string, so it
 * is only honoured when it is a path on this site — "//evil.example" and
 * "https://evil.example" would otherwise send a signed-in shopper off-site.
 */
export function safeNext(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/* Standard centered auth: logo, heading, and one card — vertically centered. */
export function AuthShell({ title, subtitle, children, below }: {
  title: string; subtitle?: string; children: React.ReactNode; below?: React.ReactNode;
}) {
  const settings = useStoreSettings();
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Shoppe's two blobs, as on the app's sign-in screens. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-28 h-[340px] w-[300px] rotate-[-20deg] rounded-[58%_42%_47%_53%/52%_61%_39%_48%] bg-brand"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-28 top-24 h-[260px] w-[240px] rotate-[15deg] rounded-[45%_55%_60%_40%/55%_45%_55%_45%] bg-blob"
      />
      <div className="relative w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" className="mb-5" aria-label={settings.business_name}>
            {settings.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt={settings.business_name} className="h-9 w-auto" />
            ) : (
              <span className="font-display text-[24px] font-extrabold tracking-tight text-ink">
                {settings.business_name}
              </span>
            )}
          </Link>
          <h1 className="font-display text-[34px] font-extrabold leading-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[14px] text-ink-muted">{subtitle}</p>}
        </div>
        <div className="rounded-2xl bg-surface p-6 shadow-card sm:p-8 dark:border dark:border-line/10">
          {children}
        </div>
        {below && <div className="mt-5">{below}</div>}
      </div>
    </div>
  );
}

export function AuthField({ label, type = "text", autoComplete, required, value, onChange, labelRight, hint }: {
  label: string; type?: string; autoComplete?: string; required?: boolean;
  value: string; onChange: (v: string) => void; labelRight?: React.ReactNode; hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-[13px] font-semibold text-ink">
        {label}
        {labelRight}
      </span>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="soft-input px-3 py-2.5"
      />
      {hint && <span className="text-[12px] text-ink-faint">{hint}</span>}
    </label>
  );
}

export function AuthPasswordField({ label, autoComplete, required, value, onChange, labelRight, hint }: {
  label: string; autoComplete?: string; required?: boolean;
  value: string; onChange: (v: string) => void; labelRight?: React.ReactNode; hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-[13px] font-semibold text-ink">
        {label}
        {labelRight}
      </span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="soft-input py-2.5 pl-3 pr-11"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded text-ink-faint transition-colors hover:text-ink"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <span className="text-[12px] text-ink-faint">{hint}</span>}
    </label>
  );
}

export function AuthError({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div
      id={id}
      className="rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-[13px] text-danger"
      role="alert"
    >
      {children}
    </div>
  );
}

export function AuthLegal({ action }: { action: string }) {
  return (
    <p className="text-[12px] leading-relaxed text-ink-muted">
      By {action}, you agree to the{" "}
      <Link href="/legal/terms" className="text-brand hover:underline">Conditions of Use</Link> and{" "}
      <Link href="/legal/privacy" className="text-brand hover:underline">Privacy Notice</Link>.
    </p>
  );
}

export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[12px] text-ink-faint">
      <span className="h-px flex-1 bg-black/10" />
      {children}
      <span className="h-px flex-1 bg-black/10" />
    </div>
  );
}
