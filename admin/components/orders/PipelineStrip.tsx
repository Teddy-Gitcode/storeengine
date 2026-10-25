import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import {
  EXCEPTIONS, STAGES, dwell, enteredAt, isTerminal, labelize, stageIndex,
  type StageCounts, type StageKey,
} from '@/lib/order-stages';

/* The line an order travels, drawn as a line.
 *
 * It replaces a vertical six-node timeline that read as history rather than
 * progress, and it appears on the list, the detail page and every queue page —
 * so "where is this order" and "where is this queue" are answered by the same
 * picture. On the list its segments filter; on a detail page they carry the
 * timestamps that order actually earned.
 *
 * A server component: the active stage is a prop, and nothing here needs
 * state.
 */

type Props = {
  /** Interactive mode: counts per stage, segments link to the filtered list. */
  counts?: StageCounts;
  /** Detail mode: this order's position and its own event log. */
  status?: string;
  events?: { to_status: string; created_at: string }[];
  /** Highlight without linking — a queue page marking its own stage. */
  activeStage?: StageKey;
  onHold?: boolean;
};

const TONE_BG: Record<string, string> = {
  warning: 'var(--gold)',
  purple: 'var(--purple)',
  info: 'var(--info)',
  primary: 'var(--brand)',
  error: 'var(--error)',
  neutral: 'var(--border-2)',
};

export default function PipelineStrip({ counts, status, events = [], activeStage, onHold }: Props) {
  const terminal = status ? isTerminal(status) : false;
  const currentIndex = status && !terminal ? stageIndex(status) : activeStage ? STAGES.findIndex((s) => s.key === activeStage) : -1;
  const entered = enteredAt(events);
  const now = Date.now();

  return (
    <section className="ak-card p-4 sm:p-5" aria-label="Order pipeline">
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const reached = currentIndex >= 0 && index <= currentIndex;
          const isCurrent = index === currentIndex;
          const done = currentIndex >= 0 && index < currentIndex;
          const at = stage.statuses.map((s) => entered[s]).find(Boolean);
          const held = isCurrent && onHold;

          // In detail mode the hint is replaced by what actually happened: when
          // this order reached the stage, and — where it is now — how long it
          // has been sitting there.
          const timing = status && isCurrent ? dwell(status, entered, now) : null;
          const detail = status
            ? at
              ? new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : reached ? 'skipped' : 'Not reached yet'
            : stage.hint;

          const body = (
            <>
              {/* min-w-0 + shrink: without them the hint kept its full width and
                  ran under the next stage ("not yet p[icon]d"). */}
              <div className="flex min-w-0 shrink items-center gap-2.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors"
                  style={{
                    background: reached ? TONE_BG[stage.tone] : 'var(--surface-2)',
                    color: reached ? '#fff' : 'var(--text-3)',
                    boxShadow: isCurrent ? `0 0 0 3px color-mix(in srgb, ${TONE_BG[stage.tone]} 22%, transparent)` : undefined,
                  }}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: reached ? 'var(--text-1)' : 'var(--text-3)' }}
                    >
                      {stage.label}
                    </span>
                    {counts && (
                      <span
                        className="font-dm-sans text-[15px] font-bold tabular-nums"
                        style={{ color: reached || !status ? 'var(--text-1)' : 'var(--text-3)' }}
                      >
                        {counts.stages[stage.key] ?? 0}
                      </span>
                    )}
                    {isCurrent && !counts && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: 'var(--brand-light)', color: 'var(--brand-ink)' }}
                      >
                        Now
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {detail}
                  </span>
                  {timing && (
                    <span
                      className="flex items-center gap-1 text-[11px] font-semibold"
                      style={{ color: timing.overSla ? 'var(--error)' : 'var(--text-3)' }}
                    >
                      {timing.overSla && <AlertTriangle size={11} aria-hidden />}
                      here {timing.text}
                    </span>
                  )}
                  {held && (
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--gold)' }}>
                      on hold
                    </span>
                  )}
                </span>
              </div>
              {/* The connector. Hidden on the last segment and on narrow
                  screens, where the segments stack and a horizontal rule
                  between them would point the wrong way. */}
              {index < STAGES.length - 1 && (
                <span
                  aria-hidden
                  className="mx-3 hidden h-[2px] min-w-6 flex-1 rounded lg:block"
                  style={{ background: done ? TONE_BG[stage.tone] : 'var(--border-2)' }}
                />
              )}
            </>
          );

          const shell = 'flex min-w-0 items-center rounded-xl px-2 py-1.5 lg:px-0';

          return (
            <li key={stage.key} className="flex min-w-0 items-center">
              {counts ? (
                <Link
                  href={`/orders?stage=${stage.key}`}
                  className={`${shell} flex-1 transition-colors hover:bg-[var(--surface-2)]`}
                  title={`${stage.hint} Show these orders.`}
                >
                  {body}
                </Link>
              ) : (
                <div className={`${shell} flex-1`}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      {terminal && status && (
        <p
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: 'var(--error-light)', color: 'var(--badge-error-ink)' }}
        >
          <AlertTriangle size={13} className="shrink-0" />
          This order was {labelize(status).toLowerCase()}. The line above stops where it left off.
        </p>
      )}

      {counts && (
        <div
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Off the line
          </span>
          {EXCEPTIONS.map((exception) => {
            const Icon = exception.icon;
            const total = counts.exceptions[exception.key] ?? 0;
            return (
              <Link
                key={exception.key}
                href={exception.href}
                className="inline-flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-70"
                style={{ color: total ? 'var(--text-2)' : 'var(--text-3)' }}
              >
                <Icon size={12} style={{ color: total ? TONE_BG[exception.tone] : 'var(--text-3)' }} />
                {exception.label}
                <span className="font-dm-sans font-bold tabular-nums">{total}</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
