'use client';

import { useState, useTransition } from 'react';
import type { AssistantConfig } from '@/lib/admin-api';

/* Not `SettingsToggle`: that one is a checkbox for a plain form post, and this
   has to say *why* it is in the state it is in. Three things can put the
   assistant off — no key, the deploy's env, or this switch — and a bare toggle
   that silently does nothing when the key is missing is the worst of them. */

export default function AssistantSwitch({
  config,
  onToggle,
}: {
  config: AssistantConfig;
  onToggle: (enabled: boolean) => Promise<void>;
}) {
  // `effective` is what the reply path will actually do; `enabled` is only what
  // this switch has been set to, and is null until somebody sets it.
  const [on, setOn] = useState(config.effective);
  const [pending, startTransition] = useTransition();

  function flip() {
    if (!config.configured) return;
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await onToggle(next);
      } catch {
        setOn(!next); // put the switch back rather than lie about the state
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-500/20 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-light-primary-text font-public-sans">
            Reply to customers automatically
          </p>
          <p className="mt-0.5 text-sm text-light-secondary-text font-public-sans">
            {!config.configured
              ? 'No API key on this deploy, so the assistant cannot run whatever this is set to.'
              : on
                ? `On — answering with ${config.model}.`
                : 'Off — every message waits for a person.'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Reply to customers automatically"
          disabled={!config.configured || pending}
          onClick={flip}
          className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          style={{ background: on ? 'var(--brand)' : 'var(--border-2)' }}
        >
          <span
            className="inline-block size-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
      </div>

      {/* Only worth saying while it is true — once the switch is used it is the
          answer, and mentioning the environment would just be noise. */}
      {config.configured && config.enabled === null && (
        <p className="text-xs text-light-secondary-text font-public-sans">
          Currently following this deploy&apos;s <code>ASSISTANT_ENABLED</code> setting. Using the
          switch overrides it from here on.
        </p>
      )}
    </div>
  );
}
