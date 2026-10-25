'use client';

import { useState, useTransition } from 'react';
import type { AdminMarketingTool } from '@/lib/admin-types';
import SettingsToggle from '@/components/sellzy/settings-toggle';

/**
 * The template's Marketing Tool card: one row per integration with a switch,
 * then Cancel / Save Change. Saving posts every switch state at once; the
 * action works out which ones actually moved.
 */
export default function MarketingToolsCard({
  tools,
  saveAction,
}: {
  tools: AdminMarketingTool[];
  saveAction: (formData: FormData) => Promise<{ error?: string; saved?: number } | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* Remounts the rows so Cancel snaps every switch back to the saved value. */
  const [formKey, setFormKey] = useState(0);

  function submit(formData: FormData) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveAction(formData);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        return;
      }
      const saved = result && 'saved' in result ? result.saved ?? 0 : 0;
      setMessage(saved ? `${saved} tool${saved === 1 ? '' : 's'} updated.` : 'Nothing changed.');
    });
  }

  return (
    <form action={submit} className="rounded-2xl bg-surface w-full" key={formKey}>
      <div className="flex items-center justify-between gap-4 p-4 sm:p-6 pb-4">
        <h3 className="text-xl font-bold text-light-primary-text leading-7 font-public-sans">Marketing Tool</h3>
      </div>

      {tools.length === 0 ? (
        <p className="px-4 sm:px-6 pb-6 text-sm text-light-secondary-text font-public-sans">
          No marketing integrations are configured yet.
        </p>
      ) : (
        <div className="divide-y divide-gray-500/20 border-t border-gray-500/20">
          {tools.map((tool) => (
            <div key={tool.id} className="flex items-start justify-between gap-6 px-4 sm:px-6 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-light-primary-text font-public-sans">{tool.name}</p>
                <p className="text-xs text-light-secondary-text font-public-sans">{tool.description}</p>
              </div>
              <SettingsToggle name={`tool_${tool.id}`} defaultChecked={tool.is_enabled} label={tool.name} />
            </div>
          ))}
        </div>
      )}

      {(error || message) && (
        <p
          className={`mx-4 sm:mx-6 mt-4 rounded-xl px-4 py-3 text-sm font-public-sans ${
            error ? 'bg-error/10 text-error' : 'bg-primary-lighter/30 text-primary-dark'
          }`}
        >
          {error ?? message}
        </p>
      )}

      <div className="flex justify-end gap-3 p-4 sm:p-6">
        <button
          type="button"
          onClick={() => { setFormKey((k) => k + 1); setMessage(null); setError(null); }}
          className="rounded-full border border-gray-300 px-4 py-1 h-7.5 text-[13px] font-bold text-light-secondary-text transition-colors hover:bg-gray-50 font-public-sans"
        >
          Cancel
        </button>
        <button
          data-manage
          type="submit"
          disabled={pending || tools.length === 0}
          className="rounded-full bg-primary px-4 py-1 h-7.5 text-[13px] font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-50 font-public-sans"
        >
          {pending ? 'Saving…' : 'Save Change'}
        </button>
      </div>
    </form>
  );
}
