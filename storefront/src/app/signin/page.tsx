"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { ApiError } from "@/lib/account-api";
import { useAuth } from "@/lib/auth-store";
import { useStoreSettings } from "@/lib/store-context";
import { AuthShell, AuthField, AuthPasswordField, AuthError, AuthLegal, AuthDivider, safeNext } from "@/components/auth";
import GoogleSignInButton, { googleEnabled } from "@/components/GoogleSignInButton";

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  // Only ever a path on this site: an absolute URL in `next` would turn the
  // sign-in page into an open redirect.
  const next = safeNext(params.get("next"));
  const justReset = params.get("reset") === "1";
  const login = useAuth((s) => s.login);
  const settings = useStoreSettings();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password, remember);
      router.push(next);
    } catch (err) {
      // The password was right and the address was never confirmed. A code is
      // already on its way, so this is a step in signing in rather than a
      // failure to report.
      if (err instanceof ApiError && err.verificationRequired) {
        const address = err.email || email;
        router.push(
          `/verify-email?email=${encodeURIComponent(address)}&next=${encodeURIComponent(next)}`,
        );
        return;
      }
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      below={
        <>
          <AuthDivider>New to {settings.business_name}?</AuthDivider>
          <Link
            href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="btn-ghost mt-3 w-full py-2.5"
          >
            Create your {settings.business_name} account
          </Link>
        </>
      }
    >
      {googleEnabled && (
        <div className="mb-5 flex flex-col gap-4">
          <GoogleSignInButton next={next} />
          <AuthDivider>or sign in with email</AuthDivider>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {justReset && (
          <div className="rounded-md border border-brand/25 bg-brand/5 px-3 py-2 text-[13px] text-brand">
            Password updated. Sign in with your new password.
          </div>
        )}
        <AuthField label="Email" type="email" autoComplete="email" required value={email} onChange={setEmail} />
        <AuthPasswordField
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
          labelRight={
            <Link href="/forgot-password" className="text-[12px] font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          }
        />
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="accent-brand h-4 w-4"
          />
          <span className="text-[13px] text-ink-muted">Keep me signed in on this device</span>
        </label>
        {error && <AuthError>{error}</AuthError>}
        <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 disabled:opacity-70">
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <AuthLegal action="continuing" />
      </form>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}
