import type { ReactNode } from "react";

/* Inline messages: a failed submit, a note, a confirmation.
 *
 * The danger variant alone was written out six times, each with the same
 * intent and slightly different padding — `rounded-lg border border-danger/20
 * bg-danger/5 px-3 py-2 text-[12.5px] text-danger` and four near-misses. */

export type AlertTone = "danger" | "info" | "success";

const tones: Record<AlertTone, string> = {
  danger: "border-danger/20 bg-danger/5 text-danger",
  info: "border-brand/25 bg-brand-50/50 text-brand-dark",
  success: "border-green-600/25 bg-green-600/5 text-green-700 dark:text-green-400",
};

export default function Alert({
  tone = "danger",
  className = "",
  children,
}: {
  tone?: AlertTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "danger" ? "alert" : undefined}
      className={`rounded-lg border px-3 py-2 text-[12.5px] ${tones[tone]} ${className}`}
    >
      {children}
    </p>
  );
}
