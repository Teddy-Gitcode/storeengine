"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { apiResetPassword } from "@/lib/account-api";
import { AuthShell, AuthPasswordField, AuthError } from "@/components/auth";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkInvalid = !uid || !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Passwords must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await apiResetPassword({ uid, token, new_password: password });
      router.push("/signin?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create new password">
      {linkInvalid ? (
        <AuthError>
          This reset link is invalid or incomplete.{" "}
          <Link href="/forgot-password" className="font-bold underline">Request a new one</Link>.
        </AuthError>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AuthPasswordField
            label="New password"
            autoComplete="new-password"
            required
            value={password}
            onChange={setPassword}
            hint="At least 8 characters"
          />
          <AuthPasswordField
            label="Re-enter new password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={setConfirm}
          />
          {error && <AuthError>{error}</AuthError>}
          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 disabled:opacity-70">
            {busy ? "Updating..." : "Save changes and sign in"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
