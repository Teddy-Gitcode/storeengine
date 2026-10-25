import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupplier } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { supplierFields, supplierPayload } from '../../locations-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = supplierPayload(formData);
  if (!payload) return { error: 'The supplier name is required.' };
  try {
    await createSupplier(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not create the supplier.' };
  }
  revalidatePath('/inventory/suppliers');
  revalidatePath('/inventory');
  redirect('/inventory/suppliers');
}

export default function AddSupplierPage() {
  return (
    <ResourceForm
      title="Add Supplier"
      backHref="/inventory/suppliers"
      submitLabel="Save Supplier"
      status={{ name: 'is_active', defaultValue: 'active', publishedValue: 'active', draftValue: 'inactive', publishedLabel: 'Active', draftLabel: 'Inactive' }}
      fields={supplierFields()}
      action={createAction}
    />
  );
}
