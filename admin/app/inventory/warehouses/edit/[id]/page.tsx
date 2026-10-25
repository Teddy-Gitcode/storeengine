import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getWarehouse, updateWarehouse } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { warehouseFields, warehousePayload } from '../../../locations-payload';

export const dynamic = 'force-dynamic';

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const warehouse = await getWarehouse(Number(id)).catch(() => null);
  if (!warehouse) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = warehousePayload(formData);
    if (!payload) return { error: 'The warehouse name is required.' };
    try {
      await updateWarehouse(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the warehouse.' };
    }
    revalidatePath('/inventory/warehouses');
    revalidatePath('/inventory');
    revalidatePath('/products/stocks');
    redirect('/inventory/warehouses');
  }

  return (
    <ResourceForm
      title="Edit Warehouse"
      backHref="/inventory/warehouses"
      submitLabel="Save Warehouse"
      status={{ name: 'is_active', defaultValue: warehouse.is_active ? 'active' : 'inactive', publishedValue: 'active', draftValue: 'inactive', publishedLabel: 'Active', draftLabel: 'Inactive' }}
      fields={warehouseFields(warehouse)}
      action={updateAction}
    />
  );
}
