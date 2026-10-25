import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createTaxRate } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { taxPayload, LOCATION_HINT, RATE_TYPES } from '../tax-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = taxPayload(formData);
  if (!payload) return { error: 'The tax name is required.' };
  try {
    await createTaxRate(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the tax rule.' };
  }
  revalidatePath('/tax');
  redirect('/tax');
}

export default function AddTaxPage() {
  return (
    <ResourceForm
      title="Create New Tax"
      backHref="/tax"
      submitLabel="Create Tax"
      status={{ name: 'is_active', defaultValue: 'active', publishedValue: 'active', draftValue: 'inactive' }}
      fields={[
        { kind: 'text', name: 'name', label: 'Tax Name', required: true, half: true },
        { kind: 'text', name: 'location', label: 'Location', half: true, hint: LOCATION_HINT },
        { kind: 'select', name: 'rate_type', label: 'Tax Type', options: RATE_TYPES, half: true },
        { kind: 'number', name: 'rate_percent', label: 'Tax Rate (%)', defaultValue: 0, half: true },
        { kind: 'textarea', name: 'notes', label: 'Short Description', rows: 4 },
      ]}
      action={createAction}
    />
  );
}
