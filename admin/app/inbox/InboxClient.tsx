'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Bot, Search, Send } from 'lucide-react';
import FilterListbox from '@/components/sellzy/filter-listbox';
import type { SupportTicket } from '@/lib/admin-types';

/* Two-pane chat, because answering someone is the job this page exists for.
   The triage the old /support table carried — status and priority — sits in the
   thread header rather than on a separate screen, so changing a status no
   longer costs a navigation away from the conversation.

   Escalation is not a control here. It is set by the assistant when it will not
   answer, and cleared by replying, so a button to toggle it by hand was a third
   way to say something the thread already says. The HUMAN badge in the list
   stays: seeing what the assistant refused is the point. */

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

/* "Needs you" is the working queue: someone is waiting on a reply, or a thread
   was escalated for a person. "All" is for looking something up. Resolved and
   closed are reachable through the status filter rather than as queues of their
   own — nobody starts their day in the closed pile. */
const QUEUES = [
  { key: 'mine', label: 'Needs you' },
  { key: 'all', label: 'All' },
] as const;
type QueueKey = (typeof QUEUES)[number]['key'];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

function shortTime(iso: string) {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'}`;
  return then.toLocaleDateString();
}

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function InboxClient({
  tickets,
  initialReference,
  replyAction,
  vouchers = [],
  setStatusAction,
  setPriorityAction,
}: {
  tickets: SupportTicket[];
  initialReference?: string;
  replyAction: (formData: FormData) => Promise<void>;
  /** Active promo codes staff can attach to a reply as a voucher card. */
  vouchers?: { code: string; name: string }[];
  setStatusAction: (reference: string, status: string) => Promise<void>;
  setPriorityAction: (reference: string, priority: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [queue, setQueue] = useState<QueueKey>('mine');
  const [status, setStatus] = useState('');
  const [activeRef, setActiveRef] = useState(initialReference ?? '');
  const [draft, setDraft] = useState('');
  const [voucher, setVoucher] = useState('');
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (queue === 'mine' && !t.awaiting_reply && !t.needs_human) return false;
      if (status && t.status !== status) return false;
      if (needle && !`${t.name} ${t.subject} ${t.email} ${t.reference}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [tickets, query, queue, status]);

  /* Keep a selection that still exists. Narrowing the queue while reading a
     thread would otherwise leave the pane showing a conversation the list no
     longer offers, with no way back to it. */
  const active = tickets.find((t) => t.reference === activeRef) ?? filtered[0] ?? null;
  useEffect(() => {
    if (active && active.reference !== activeRef) setActiveRef(active.reference);
  }, [active, activeRef]);

  const needsYou = tickets.filter((t) => t.awaiting_reply || t.needs_human).length;

  function lastMessage(ticket: SupportTicket) {
    const last = ticket.replies[ticket.replies.length - 1];
    if (!last) return ticket.message;
    if (last.author_kind === 'ai') return `Assistant: ${last.body}`;
    return last.author_kind === 'staff' ? `You: ${last.body}` : last.body;
  }

  function send(formData: FormData) {
    startTransition(async () => {
      await replyAction(formData);
      setDraft('');
      setVoucher('');
    });
  }

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[600px] overflow-hidden rounded-2xl bg-surface">
      {/* Conversation list */}
      <div className="hidden h-full w-80 shrink-0 md:block lg:w-[345px]">
        <div className="flex h-full flex-col border-r border-gray-500/20 pb-4">
          <div className="space-y-3 px-6 pb-4 pt-6">
            <h2 className="text-xl font-bold text-light-primary-text font-public-sans">Inbox</h2>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-primary-text" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                aria-label="Search conversations"
                className="h-9 w-full rounded-full border border-gray-500/20 bg-gray-100 py-2 pl-10 pr-4 text-sm text-light-primary-text focus:outline-none font-public-sans"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-full bg-gray-100 p-0.5" role="tablist" aria-label="Conversation queue">
                {QUEUES.map((q) => (
                  <button
                    key={q.key}
                    role="tab"
                    aria-selected={queue === q.key}
                    onClick={() => setQueue(q.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors font-public-sans ${
                      queue === q.key
                        ? 'bg-surface text-light-primary-text shadow-sm'
                        : 'text-light-secondary-text hover:text-light-primary-text'
                    }`}
                  >
                    {q.label}
                    {q.key === 'mine' && needsYou > 0 && (
                      <span className="ml-1.5 tabular-nums text-primary">{needsYou}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <FilterListbox
                  value={status}
                  onChange={setStatus}
                  options={[{ value: '', label: 'Any status' }, ...STATUS_OPTIONS]}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-1">
            {filtered.map((t) => {
              const isActive = active?.reference === t.reference;
              return (
                <button
                  key={t.reference}
                  onClick={() => setActiveRef(t.reference)}
                  className={`flex w-full items-start gap-3 rounded-lg px-5 py-3 text-left transition-colors hover:bg-gray-50 ${isActive ? 'bg-gray-100' : 'bg-transparent'}`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-lighter text-sm font-semibold text-primary-dark font-public-sans">
                    {initials(t.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-2 flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-light-primary-text font-public-sans">{t.name}</span>
                      <span className="shrink-0 text-xs text-light-disabled-text font-public-sans">{shortTime(t.last_message_at)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate pr-2 text-sm text-light-secondary-text font-public-sans">{lastMessage(t)}</span>
                      {t.needs_human ? (
                        <span className="shrink-0 rounded bg-warning-lighter px-1.5 py-0.5 text-[10px] font-bold uppercase text-warning-dark font-public-sans">
                          Human
                        </span>
                      ) : t.awaiting_reply ? (
                        <span
                          className="size-2 shrink-0 rounded-full bg-primary"
                          title="Waiting on a reply"
                          aria-label="Waiting on a reply"
                        />
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-light-secondary-text font-public-sans">
                {queue === 'mine'
                  ? 'Nothing waiting on you — every conversation has been answered.'
                  : 'No conversations match this filter.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Message thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-sm text-light-secondary-text font-public-sans">
              No conversations yet — support tickets appear here as customers write in.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 border-b border-gray-500/20 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-lighter text-sm font-semibold text-primary-dark font-public-sans">
                  {initials(active.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-light-primary-text font-public-sans">{active.name}</p>
                  <p className="truncate text-xs text-light-secondary-text font-public-sans">
                    {active.reference} · {active.subject}
                  </p>
                </div>
              </div>

              {/* Triage, in reach of the conversation it describes. */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-36">
                  <FilterListbox
                    key={`s-${active.reference}-${active.status}`}
                    value={active.status}
                    onChange={(v) => startTransition(() => setStatusAction(active.reference, v))}
                    options={STATUS_OPTIONS}
                  />
                </div>
                <div className="w-32">
                  <FilterListbox
                    key={`p-${active.reference}-${active.priority}`}
                    value={active.priority}
                    onChange={(v) => startTransition(() => setPriorityAction(active.reference, v))}
                    options={PRIORITY_OPTIONS}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="mr-auto flex max-w-[80%] flex-col items-start">
                <div className="max-w-xs rounded-lg rounded-bl-none bg-gray-200 p-3 text-sm leading-relaxed text-light-primary-text font-public-sans">
                  {active.message}
                </div>
                <span className="mt-1 text-xs text-light-secondary-text font-public-sans">{clockTime(active.created_at)}</span>
              </div>

              {active.replies.map((r) => {
                const fromUs = r.author_kind !== 'customer';
                const isAi = r.author_kind === 'ai';
                return (
                  <div
                    key={r.id}
                    className={`flex max-w-[80%] flex-col ${fromUs ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-lg p-3 text-sm leading-relaxed font-public-sans ${
                        !fromUs
                          ? 'rounded-bl-none bg-gray-200 text-light-primary-text'
                          : isAi
                            /* The assistant's turns are marked, not blended in.
                               Staff have to be able to see what a customer was
                               already told before they answer. */
                            ? 'rounded-br-none border border-dashed border-info bg-info-lighter text-light-primary-text'
                            : 'rounded-br-none bg-primary-lighter text-light-primary-text'
                      }`}
                    >
                      {r.body}
                      {r.voucher && (
                        /* What the customer sees as a card they can collect. */
                        <div className="mt-2 rounded-md border border-dashed border-primary bg-surface px-3 py-2 text-xs">
                          <span className="font-bold tracking-wide">{r.voucher.code}</span>
                          <span className="text-light-secondary-text"> · {r.voucher.name}</span>
                          {!r.voucher.usable && <span className="text-error"> · no longer valid</span>}
                        </div>
                      )}
                    </div>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-light-secondary-text font-public-sans">
                      {isAi && <Bot size={12} className="text-info-dark" />}
                      {isAi ? 'Assistant' : r.author} · {clockTime(r.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>

            <form data-manage action={send} className="p-6">
              <input type="hidden" name="reference" value={active.reference} />
              {vouchers.length > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <label htmlFor="voucher_code" className="text-xs text-light-secondary-text font-public-sans">
                    Attach a voucher
                  </label>
                  <select
                    id="voucher_code"
                    name="voucher_code"
                    value={voucher}
                    onChange={(e) => setVoucher(e.target.value)}
                    className="rounded-md border border-gray-500/20 bg-surface px-2 py-1 text-xs font-public-sans"
                  >
                    <option value="">None</option>
                    {vouchers.map((v) => (
                      <option key={v.code} value={v.code}>
                        {v.code} — {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex h-18 items-center gap-2 rounded-xl border border-gray-500/20 bg-gray-50 px-6 py-4">
                <input
                  name="body"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message"
                  aria-label="Reply message"
                  className="flex-1 bg-transparent text-sm text-light-primary-text placeholder:text-light-disabled-text focus:outline-none font-public-sans"
                />
                <button
                  type="submit"
                  disabled={pending || (!draft.trim() && !voucher)}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
                  title="Send reply"
                  aria-label="Send reply"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
