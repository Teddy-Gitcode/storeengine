"use client";
import Link from "next/link";
import { useState } from "react";
import { apiForgotPassword } from "@/lib/account-api";
import { useStoreSettings } from "@/lib/store-context";
import { AuthShell, AuthField, AuthError, AuthDivider } from "@/components/auth";

export default function ForgotPasswordPage() {
  const settings = useStoreSettings();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiForgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Password assistance"
      below={
        <>
          <AuthDivider>Remembered it?</AuthDivider>
          <Link href="/signin" className="btn-ghost mt-3 w-full py-2.5">Sign in</Link>
        </>
      }
    >
      {sent ? (
        <p className="text-[14px] leading-relaxed text-ink-muted">
          If an account exists for <span className="font-semibold text-ink">{email}</span>, we&apos;ve sent a
          link to reset your password. Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Enter the email associated with your {settings.business_name} account and we&apos;ll send you a
            reset link.
          </p>
          <AuthField label="Email" type="email" autoComplete="email" required value={email} onChange={setEmail} />
          {error && <AuthError>{error}</AuthError>}
          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 disabled:opacity-70">
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
