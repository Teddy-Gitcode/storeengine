import { revalidatePath } from 'next/cache';
import { Bot } from 'lucide-react';
import { getAssistantConfig, setAssistantEnabled } from '@/lib/admin-api';
import AssistantSwitch from './AssistantSwitch';

export const dynamic = 'force-dynamic';

/* The switch lives in the admin rather than only in the deploy's environment
   because of when it gets used: the reason to turn the assistant off is almost
   always that it has just told a customer something wrong, and that is a bad
   moment to need a shell on the server. */

async function toggleAction(enabled: boolean) {
  'use server';
  await setAssistantEnabled(enabled);
  revalidatePath('/assistant');
  revalidatePath('/inbox');
}

export default async function AssistantPage() {
  const config = await getAssistantConfig().catch(() => null);

  return (
    <div className="w-full rounded-2xl bg-surface p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-info-lighter">
          <Bot size={20} className="text-info-dark" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-light-primary-text font-public-sans">Customer assistant</h1>
          <p className="text-sm text-light-secondary-text font-public-sans">
            Answers order status and live deals as the first reply in a support thread.
          </p>
        </div>
      </div>

      {!config ? (
        <p className="rounded-xl border border-warning bg-warning-lighter px-4 py-3 text-sm text-warning-dark font-public-sans">
          Could not read the assistant settings — the backend may not have this endpoint yet.
        </p>
      ) : (
        <AssistantSwitch config={config} onToggle={toggleAction} />
      )}

      <div className="mt-6 space-y-2 border-t border-gray-500/20 pt-6">
        <h2 className="text-sm font-semibold text-light-primary-text font-public-sans">What it will and won&apos;t do</h2>
        <ul className="space-y-1.5 text-sm text-light-secondary-text font-public-sans">
          <li>• Answers only from the customer&apos;s own orders and the deals that are live now.</li>
          <li>• Cannot change anything — no refunds, no order edits, no discounts.</li>
          <li>• Anything else it hands to a person, and the thread appears under <strong>Needs you</strong> in the inbox.</li>
          <li>• Its replies are labelled <strong>Assistant</strong> in the thread, so you can see what a customer was told.</li>
        </ul>
      </div>
    </div>
  );
}
