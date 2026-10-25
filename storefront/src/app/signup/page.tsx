"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useAuth } from "@/lib/auth-store";
import { AuthShell, AuthField, AuthPasswordField, AuthError, AuthLegal, AuthDivider, safeNext } from "@/components/auth";
import GoogleSignInButton, { googleEnabled } from "@/components/GoogleSignInButton";

function SignUpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const register = useAuth((s) => s.register);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Enter your name.");
    if (password.length < 8) return setError("Passwords must be at least 8 characters.");
    setBusy(true);
    try {
      const created = await register({
        email,
        password,
        name: name.trim(),
        marketing_opt_in: marketing,
      });
      // The account exists and is useless until the address answers, so the
      // only place to go from here is the code.
      router.push(
        `/verify-email?email=${encodeURIComponent(created.email)}&next=${encodeURIComponent(next)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      below={
        <>
          <AuthDivider>Already have an account?</AuthDivider>
          <Link
            href={`/signin${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="btn-ghost mt-3 w-full py-2.5"
          >
            Sign in
          </Link>
        </>
      }
    >
      {googleEnabled && (
        <div className="mb-5 flex flex-col gap-4">
          <GoogleSignInButton next={next} />
          <AuthDivider>or sign up with email</AuthDivider>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField label="Your name" autoComplete="name" required value={name} onChange={setName} />
        <AuthField label="Email" type="email" autoComplete="email" required value={email} onChange={setEmail} />
        {/* No phone here. It is asked for at the two places it is actually
            needed and actually known: checkout, and saving an address — both
            of which require one and both of which know the country, which
            signup does not. Collecting it a third time up front only added a
            field to the form that most of the traffic abandons. */}
        <AuthPasswordField
          label="Password"
          autoComplete="new-password"
          required
          value={password}
          onChange={setPassword}
          hint="At least 8 characters"
        />
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="accent-brand mt-0.5 h-4 w-4"
          />
          <span className="text-[13px] leading-relaxed text-ink-muted">
            Email me about offers and new arrivals
          </span>
        </label>
        {error && <AuthError>{error}</AuthError>}
        <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 disabled:opacity-70">
          {busy ? "Creating account..." : "Create account"}
        </button>
        <AuthLegal action="creating an account" />
      </form>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpInner />
    </Suspense>
  );
}
