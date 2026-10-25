'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, Trash2, X } from 'lucide-react';
import type { SecretState } from '@/lib/admin-types';

/**
 * One stored credential, shown as what it is rather than as its value.
 *
 * The contract this component is built on is enforced at the API, not here:
 * a GET of an integration's config carries no secret values at all, only
 * `SecretState` (see `apps/integrations/secrets.py`). So this component is
 * never handed the real thing — it has to ask for it, and asking is a logged,
 * rate-limited POST that needs manage rights.
 *
 * That is why `value` is not a prop and cannot be one. A revealed value lives
 * in component state, for thirty seconds, and is never written to
 * localStorage, a URL, a form's defaultValue, or anywhere React will
 * re-render it from later.
 */

const HIDE_AFTER_SECONDS = 30;

type Props = {
  field: string;
  label: string;
  state: SecretState;
  /** Fetches the real value. Logged server-side. */
  revealAction: (field: string) => Promise<{ value?: string; error?: string }>;
  /** Writes a new value, or clears it when given an empty string. */
  saveAction: (field: string, value: string) => Promise<{ error?: string } | void>;
  help?: string;
  /** A credential that is long and structured — pasted as a block, not typed. */
  multiline?: boolean;
  canManage?: boolean;
};

export default function SecretField({
  field,
  label,
  state,
  revealAction,
  saveAction,
  help,
  multiline = false,
  canManage = true,
}: Props) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(HIDE_AFTER_SECONDS);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [showDraft, setShowDraft] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hide = useCallback(() => {
    setRevealed(null);
    setCountdown(HIDE_AFTER_SECONDS);
    setCopied(false);
  }, []);

  // A revealed secret is on screen for thirty seconds, and gives up sooner on
  // any sign that the person has stopped looking at it: Escape, switching tab,
  // hiding the window. Somebody who reveals a key and walks away should not
  // leave it on the screen behind them.
  useEffect(() => {
    if (revealed === null) return;
    const tick = setInterval(() => setCountdown((n) => (n <= 1 ? (hide(), HIDE_AFTER_SECONDS) : n - 1)), 1000);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    const onVisibility = () => { if (document.hidden) hide(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', hide);
    return () => {
      clearInterval(tick);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', hide);
    };
  }, [revealed, hide]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  function reveal() {
    setError(null);
    startTransition(async () => {
      const result = await revealAction(field);
      if (result.error || !result.value) {
        setError(result.error ?? 'That credential could not be read.');
        return;
      }
      setCountdown(HIDE_AFTER_SECONDS);
      setRevealed(result.value);
    });
  }

  function save(next: string) {
    setError(null);
    startTransition(async () => {
      const result = await saveAction(field, next);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setConfirmClear(false);
      setDraft('');
      setShowDraft(false);
      hide();
    });
  }

  async function copy() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  const setOn = state.updated_at
    ? new Date(state.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="ak-field-label">{label}</span>
        {state.is_set && setOn && (
          <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
            Set {setOn}{state.updated_by ? ` by ${state.updated_by}` : ''}
          </span>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <div className="relative flex items-center">
            {multiline ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                placeholder="Paste the full service-account JSON from Firebase"
                className="ak-input w-full font-mono text-[12px]"
                style={{ borderRadius: 20, padding: '14px 18px', height: 'auto', resize: 'vertical' }}
              />
            ) : (
              <>
                <input
                  type={showDraft ? 'text' : 'password'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={`Paste the new ${label.toLowerCase()}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && draft.trim()) save(draft.trim());
                    if (e.key === 'Escape') { setEditing(false); setDraft(''); }
                  }}
                  className="ak-input w-full font-mono text-[13px]"
                  style={{ height: 48, borderRadius: 9999, padding: '0 52px 0 18px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowDraft((v) => !v)}
                  aria-label={showDraft ? 'Hide what you typed' : 'Show what you typed'}
                  className="absolute right-2 grid h-9 w-9 place-items-center rounded-full"
                  style={{ color: 'var(--text-3)' }}
                >
                  {showDraft ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Action onClick={() => save(draft.trim())} disabled={pending || !draft.trim()} primary>
              {pending ? 'Saving…' : 'Save'}
            </Action>
            <Action onClick={() => { setEditing(false); setDraft(''); setShowDraft(false); setError(null); }} disabled={pending}>
              Cancel
            </Action>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden font-mono text-[13px]"
            style={{
              height: 48,
              borderRadius: 9999,
              padding: '0 18px',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: state.is_set ? 'var(--text-1)' : 'var(--text-3)',
            }}
          >
            <KeyRound size={14} className="shrink-0" style={{ color: 'var(--text-3)' }} />
            {revealed !== null ? (
              <span className="truncate" title={revealed}>{revealed}</span>
            ) : state.is_set ? (
              <span className="truncate">
                {'•'.repeat(16)}
                {state.last4 && <span style={{ color: 'var(--text-3)' }}> {state.last4}</span>}
              </span>
            ) : (
              <span>Not set</span>
            )}
          </span>

          {canManage && state.is_set && (
            <>
              <Action onClick={revealed !== null ? hide : reveal} disabled={pending}>
                {revealed !== null ? `Hide (${countdown}s)` : pending ? 'Reading…' : 'Show'}
              </Action>
              <Action
                onClick={copy}
                disabled={revealed === null}
                title={revealed === null ? 'Reveal it first' : `Copy ${label}`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </Action>
              <Action onClick={() => { setEditing(true); setError(null); }} disabled={pending}>Rotate</Action>
              <Action onClick={() => setConfirmClear(true)} disabled={pending} danger>
                <Trash2 size={13} />
              </Action>
            </>
          )}
          {canManage && !state.is_set && (
            <Action onClick={() => { setEditing(true); setError(null); }} disabled={pending} primary>
              Set…
            </Action>
          )}
        </div>
      )}

      {help && <span className="ak-help">{help}</span>}
      {error && <span className="text-xs" style={{ color: 'var(--error)' }}>{error}</span>}

      {confirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          role="dialog"
          aria-modal="true"
          aria-label={`Clear ${label}`}
          onClick={() => !pending && setConfirmClear(false)}
        >
          <div className="ak-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Clear {label}?</h3>
              <button type="button" onClick={() => setConfirmClear(false)} aria-label="Close" style={{ color: 'var(--text-3)' }}>
                <X size={18} />
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              Whatever uses this credential stops working until a new one is set. The old value is not
              recoverable from here.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Action onClick={() => setConfirmClear(false)} disabled={pending}>Keep it</Action>
              <Action onClick={() => save('')} disabled={pending} danger>
                {pending ? 'Clearing…' : 'Clear it'}
              </Action>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Action({
  children, onClick, disabled, primary, danger, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
      style={
        primary
          ? { background: 'var(--brand)', color: '#fff' }
          : danger
            ? { border: '1px solid var(--error-border)', color: 'var(--error)' }
            : { border: '1px solid var(--border-2)', color: 'var(--text-2)' }
      }
    >
      {children}
    </button>
  );
}
