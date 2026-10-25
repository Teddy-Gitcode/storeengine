import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createWarehouse } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { warehouseFields, warehousePayload } from '../../locations-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = warehousePayload(formData);
  if (!payload) return { error: 'The warehouse name is required.' };
  try {
    await createWarehouse(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not create the warehouse.' };
  }
  revalidatePath('/inventory/warehouses');
  revalidatePath('/inventory');
  redirect('/inventory/warehouses');
}

export default function AddWarehousePage() {
  return (
    <ResourceForm
      title="Add Warehouse"
      backHref="/inventory/warehouses"
      submitLabel="Save Warehouse"
      status={{ name: 'is_active', defaultValue: 'active', publishedValue: 'active', draftValue: 'inactive', publishedLabel: 'Active', draftLabel: 'Inactive' }}
      fields={warehouseFields()}
      action={createAction}
    />
  );
}
