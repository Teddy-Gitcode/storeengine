"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { apiResendVerification } from "@/lib/account-api";
import { useAuth } from "@/lib/auth-store";
import { AuthShell, AuthError } from "@/components/auth";

/** Long enough to switch to a mail app and back; the server agrees to ten
 *  minutes and will say so itself if this drifts. */
const CODE_LENGTH = 6;

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") || "";
  const next = params.get("next") || "/account";
  const verifyEmail = useAuth((s) => s.verifyEmail);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState<string | null>(null);
  const submitted = useRef(false);

  async function submit(value: string) {
    if (busy || submitted.current) return;
    submitted.current = true;
    setBusy(true);
    setError(null);
    try {
      const { ordersLinked } = await verifyEmail(email, value);
      // Straight on to where they were going. Confirming is the last step of
      // signing in, not a page to be congratulated on.
      const target = ordersLinked > 0 ? "/account?orders_linked=" + ordersLinked : next;
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code is not right.");
      setCode("");
      setBusy(false);
      submitted.current = false;
    }
  }

  // Six digits is the whole form; making them press a button as well is a step
  // that exists only to be pressed.
  useEffect(() => {
    if (code.length === CODE_LENGTH) void submit(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function handleResend() {
    if (resending) return;
    setResending(true);
    setResent(null);
    setError(null);
    try {
      const res = await apiResendVerification(email);
      setResent(res.detail);
    } catch {
      setResent("Could not send a new code. Try again shortly.");
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <AuthShell title="Confirm your email">
        <AuthError>
          We don&apos;t know which address to confirm. Sign in and we&apos;ll send a new code.
        </AuthError>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Confirm your email">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-ink-muted">
          We sent a {CODE_LENGTH}-digit code to <span className="font-semibold text-ink">{email}</span>.
          It expires in 10 minutes.
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="code">
            Enter the code
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
            disabled={busy}
            // The keyboard that has digits on it, and the one-tap fill iOS and
            // Android offer when the code is still in the notification shade.
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="000000"
            aria-describedby={error ? "code-error" : undefined}
            className="soft-input px-3 py-3 text-center text-2xl font-bold tracking-[0.4em] disabled:opacity-70"
          />
          {busy && <p className="text-sm text-ink-muted">Confirming…</p>}
          {error && <AuthError id="code-error">{error}</AuthError>}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm font-semibold underline disabled:opacity-70 self-start"
          >
            {resending ? "Sending…" : "Send a new code"}
          </button>
          {resent && <p className="text-sm text-ink-muted">{resent}</p>}
        </div>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
