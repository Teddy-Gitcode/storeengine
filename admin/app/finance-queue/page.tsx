import { renderQueue } from '../queues';

export const dynamic = 'force-dynamic';

// Phase 2 — money has not cleared. Bank transfers, cash on delivery and
// anything a provider rejected wait here for a human to verify.
export default function FinanceQueuePage() {
  return renderQueue({
    stage: 'pending',
    step: 1,
    queue: 'finance',
    move: 'approve_payment',
    title: 'Finance Queue',
    actionLabel: 'Approve payment',
    emptyLabel: 'No payments waiting on verification',
  });
}
