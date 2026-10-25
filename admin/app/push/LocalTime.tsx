'use client';

/** A stored UTC instant, shown in the reader's own timezone.
 *
 * A client component on purpose. Rendered on the server this would format in
 * the server's timezone (UTC), which is what made mis-scheduled campaigns look
 * correct in the list — the admin typed 08:01, it was stored as 08:01Z, and
 * the page rendered "08:01" back at them.
 *
 * `suppressHydrationWarning` because the server's pass and the browser's
 * legitimately differ whenever the reader isn't in UTC; the browser's is the
 * one we want.
 */
export default function LocalTime({ iso, dash = '—' }: { iso: string | null; dash?: string }) {
  if (!iso) return <>{dash}</>;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <>{dash}</>;
  return (
    <time dateTime={iso} title={date.toString()} suppressHydrationWarning>
      {date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </time>
  );
}
