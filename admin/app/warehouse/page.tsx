import { renderQueue } from '../queues';

export const dynamic = 'force-dynamic';

// Phase 3 — paid and waiting to be picked and boxed. Weight and dimensions
// apply to the whole batch, so leave them blank for a mixed selection and
// record them per order instead.
export default function WarehousePage() {
  return renderQueue({
    stage: 'processing',
    step: 2,
    queue: 'warehouse',
    move: 'mark_packed',
    title: 'Warehouse · To Pack',
    actionLabel: 'Mark packed',
    emptyLabel: 'Nothing to pack',
    extraFields: [
      { name: 'weight_grams', label: 'Weight (g)', type: 'number', placeholder: 'Weight (g)' },
      { name: 'length_cm', label: 'Length (cm)', type: 'number', placeholder: 'L (cm)' },
      { name: 'width_cm', label: 'Width (cm)', type: 'number', placeholder: 'W (cm)' },
      { name: 'height_cm', label: 'Height (cm)', type: 'number', placeholder: 'H (cm)' },
    ],
  });
}
