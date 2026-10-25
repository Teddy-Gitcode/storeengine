import {
  bulkMoveOrders, getOrders, getOrderStageCounts, getStoreSettings,
  type BulkOrderMove, type OrderQueue as QueueName,
} from '@/lib/admin-api';
import OrderQueue, { type BulkOutcome, type QueueExtraField } from '@/components/sellzy/order-queue';
import PipelineStrip from '@/components/orders/PipelineStrip';
import type { StageKey } from '@/lib/order-stages';

/**
 * Every pipeline stage is the same page with a different queue, action and
 * batch fields, so they are built from one definition rather than four
 * near-identical files. Which orders a queue holds is decided by the backend
 * (`?queue=`), so a stage can never drift between its list and its count.
 */
export type QueueConfig = {
  queue: QueueName;
  move: BulkOrderMove;
  title: string;
  actionLabel: string;
  emptyLabel: string;
  extraFields?: QueueExtraField[];
  /** Where this queue sits on the line, so the strip can mark it. */
  stage: StageKey;
  /** Which of the four it is, in the order the nav numbers them. */
  step: 1 | 2 | 3 | 4;
};

export async function renderQueue(config: QueueConfig) {
  const [page, settings, counts] = await Promise.all([
    getOrders({ queue: config.queue, page_size: 200 }),
    getStoreSettings().catch(() => null),
    getOrderStageCounts().catch(() => null),
  ]);

  async function moveAction(formData: FormData): Promise<BulkOutcome | { error: string }> {
    'use server';
    const numbers = formData.getAll('numbers').map(String).filter(Boolean);
    if (numbers.length === 0) return { error: 'Select at least one order.' };

    const extra: Record<string, string> = {};
    for (const field of config.extraFields ?? []) {
      const value = String(formData.get(field.name) || '').trim();
      if (value) extra[field.name] = value;
    }

    try {
      const result = await bulkMoveOrders(config.move, numbers, extra);
      // The moved orders have left this queue — re-fetch so they disappear.
      const { revalidatePath } = await import('next/cache');
      revalidatePath(`/${config.queue === 'transit' ? 'in-transit' : config.queue}`);
      revalidatePath('/orders');
      return { updated: result.updated, failed: result.failed };
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      return { error: message.split(' — ')[1] || 'The batch could not be moved. Try again.' };
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* The same strip the orders list and every order detail page draws, with
          this queue's own stage marked — so somebody working one list can see
          where it sits on the line rather than only what is in front of them. */}
      {counts && <PipelineStrip counts={counts} activeStage={config.stage} />}
      <OrderQueue
        orders={page.results}
        title={config.title}
        subtitle={`Stage ${config.step} of 4`}
        actionLabel={config.actionLabel}
        emptyLabel={config.emptyLabel}
        extraFields={config.extraFields}
        currencyCode={settings?.currency_code || 'USD'}
        locale={settings?.locale || 'en-US'}
        moveAction={moveAction}
      />
    </div>
  );
}
