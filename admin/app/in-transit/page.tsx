import { renderQueue } from '../queues';

export const dynamic = 'force-dynamic';

// Phase 5 — out of the building. Staff work is done; this list exists so a
// delivery can be confirmed when the carrier does not report back.
export default function InTransitPage() {
  return renderQueue({
    stage: 'shipped',
    step: 4,
    queue: 'transit',
    move: 'mark_delivered',
    title: 'In Transit',
    actionLabel: 'Mark delivered',
    emptyLabel: 'Nothing in transit',
  });
}
