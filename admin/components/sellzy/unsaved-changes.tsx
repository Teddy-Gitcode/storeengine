'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { PillButton } from '@/components/sellzy/product-ui';

/**
 * A form that refuses to be abandoned quietly.
 *
 * Editing a product and then clicking anything in the sidebar threw the edits
 * away without a word — the admin had no unsaved-change handling anywhere, so
 * the only feedback was noticing later that the price never changed.
 *
 * Dirtiness is the live form compared against a snapshot, not a per-field
 * `onChange` flag, so typing into a field and typing the original value back is
 * correctly clean. `resetKey` re-takes the snapshot: pass something the server
 * changes only on a successful write (a row's `updated_at`), and a save the API
 * rejects correctly leaves the form dirty.
 */
/* A page can hold more than one guarded form. Both listen on the document, so
   without this both would answer the same click and stack two dialogs — the
   second left orphaned behind the first. Whichever catches the event first owns
   the prompt; "Discard and leave" navigates away from all of them anyway. */
let dialogOpen = false;

export default function GuardedForm({
  action,
  resetKey,
  deps,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** Changes when the server has accepted a save. */
  resetKey: unknown;
  /* Values held in React state rather than in a field the user types into —
     a toggle backed by a hidden input, a picker. Changing one of those fires
     no input event, so the form would stay "clean" while visibly edited. */
  deps?: React.DependencyList;
  className?: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const baseline = useRef<string>('');
  const [dirty, setDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const router = useRouter();

  const snapshot = useCallback(() => {
    const form = formRef.current;
    if (!form) return '';
    // Files are excluded: a file input cannot be restored to a previous value,
    // and reading one would make every form with an upload permanently dirty.
    return [...new FormData(form).entries()]
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => `${k}=${v as string}`)
      .join(' ');
  }, []);

  // Re-baseline on mount and whenever the server confirms a write.
  useEffect(() => {
    baseline.current = snapshot();
    setDirty(false);
  }, [resetKey, snapshot]);

  const recheck = useCallback(() => {
    setDirty(snapshot() !== baseline.current);
  }, [snapshot]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(recheck, deps ?? []);

  useEffect(() => () => { dialogOpen = false; }, []);

  // Closing the tab or hitting reload — the browser's own prompt is the only
  // thing that can block these.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  /* In-app navigation. The App Router has no "route change is starting" hook to
     cancel, so the click is caught on the way down and held; modified clicks and
     new-tab links are left alone because they do not take this page away. */
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.target === '_blank') return;
      if (formRef.current?.contains(anchor)) return;
      e.preventDefault();
      if (dialogOpen) return;
      dialogOpen = true;
      setPendingHref(href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onInput={recheck}
        onChange={recheck}
        onSubmit={() => {
          // Optimistic: the save is away, so stop blocking navigation. A
          // rejected save re-dirties the form because `resetKey` never moved.
          baseline.current = snapshot();
          setDirty(false);
        }}
        className={className}
      >
        {children}
      </form>

      {pendingHref && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-title"
        >
          <div className="bg-surface rounded-2xl w-full max-w-sm p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning-dark" />
              <div>
                <h2 id="unsaved-title" className="text-lg font-bold text-light-primary-text font-public-sans">
                  Unsaved changes
                </h2>
                <p className="mt-1 text-sm text-light-secondary-text font-public-sans">
                  You have edits on this page that have not been saved. Leaving now discards them.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <PillButton
                type="button"
                variant="secondary"
                onClick={() => { dialogOpen = false; setPendingHref(null); }}
              >
                Stay
              </PillButton>
              <PillButton
                type="button"
                onClick={() => {
                  const href = pendingHref;
                  dialogOpen = false;
                  setPendingHref(null);
                  setDirty(false);
                  baseline.current = snapshot();
                  router.push(href);
                }}
              >
                Discard and leave
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
