import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getSupplier, updateSupplier } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { supplierFields, supplierPayload } from '../../../locations-payload';

export const dynamic = 'force-dynamic';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await getSupplier(Number(id)).catch(() => null);
  if (!supplier) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = supplierPayload(formData);
    if (!payload) return { error: 'The supplier name is required.' };
    try {
      await updateSupplier(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the supplier.' };
    }
    revalidatePath('/inventory/suppliers');
    revalidatePath('/inventory');
    redirect('/inventory/suppliers');
  }

  return (
    <ResourceForm
      title="Edit Supplier"
      backHref="/inventory/suppliers"
      submitLabel="Save Supplier"
      status={{ name: 'is_active', defaultValue: supplier.is_active ? 'active' : 'inactive', publishedValue: 'active', draftValue: 'inactive', publishedLabel: 'Active', draftLabel: 'Inactive' }}
      fields={supplierFields(supplier)}
      action={updateAction}
    />
  );
}
