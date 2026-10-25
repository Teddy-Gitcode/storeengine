import { renderQueue } from '../queues';

export const dynamic = 'force-dynamic';

// Phase 4 — boxed and waiting for a label. Carrier and tracking are written
// onto a Shipment, which is what the customer's tracking page reads.
export default function LogisticsPage() {
  return renderQueue({
    stage: 'processing',
    step: 3,
    queue: 'logistics',
    move: 'dispatch',
    title: 'Logistics · To Dispatch',
    actionLabel: 'Dispatch',
    emptyLabel: 'Nothing waiting for a courier',
    extraFields: [
      { name: 'carrier', label: 'Carrier', placeholder: 'Carrier' },
      { name: 'tracking_number', label: 'Tracking number', placeholder: 'Tracking no.' },
    ],
  });
}
