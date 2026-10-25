import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getTaxRate, updateTaxRate } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { taxPayload, LOCATION_HINT, RATE_TYPES } from '../../tax-payload';

export const dynamic = 'force-dynamic';

export default async function EditTaxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rate = await getTaxRate(Number(id)).catch(() => null);
  if (!rate) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = taxPayload(formData);
    if (!payload) return { error: 'The tax name is required.' };
    try {
      await updateTaxRate(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the tax rule.' };
    }
    revalidatePath('/tax');
    redirect('/tax');
  }

  return (
    <ResourceForm
      title="Edit Tax"
      backHref="/tax"
      status={{ name: 'is_active', defaultValue: rate.is_active ? 'active' : 'inactive', publishedValue: 'active', draftValue: 'inactive' }}
      fields={[
        { kind: 'text', name: 'name', label: 'Tax Name', defaultValue: rate.name, required: true, half: true },
        { kind: 'text', name: 'location', label: 'Location', defaultValue: rate.location, half: true, hint: LOCATION_HINT },
        { kind: 'select', name: 'rate_type', label: 'Tax Type', defaultValue: rate.rate_type, options: RATE_TYPES, half: true },
        { kind: 'number', name: 'rate_percent', label: 'Tax Rate (%)', defaultValue: rate.rate_percent, half: true },
        { kind: 'textarea', name: 'notes', label: 'Short Description', defaultValue: rate.notes, rows: 4 },
      ]}
      action={updateAction}
    />
  );
}
