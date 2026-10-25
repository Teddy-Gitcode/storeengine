import { revalidatePath } from 'next/cache';
import { getSuppliers, deleteSupplier } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deleteSupplier(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'That supplier could not be deleted.' };
  }
  revalidatePath('/inventory/suppliers');
  revalidatePath('/inventory');
}

export default async function SuppliersPage() {
  const page = await getSuppliers().catch(() => null);
  const suppliers = page?.results ?? [];

  return (
    <ResourceList
      title="Suppliers"
      createHref="/inventory/suppliers/add"
      createLabel="Add Supplier"
      columns={[
        { key: 'name', label: 'Supplier' },
        { key: 'contact', label: 'Contact' },
        { key: 'phone', label: 'Phone' },
        { key: 'lead', label: 'Lead Time' },
        { key: 'status', label: 'Status' },
      ]}
      statusFilter={{ label: 'All status', options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ] }}
      rows={suppliers.map((s) => ({
        id: s.id,
        search: `${s.name} ${s.contact_name} ${s.email} ${s.phone}`,
        status: s.is_active ? 'active' : 'inactive',
        cells: {
          name: <span className="font-semibold text-light-primary-text">{s.name}</span>,
          contact: s.contact_name || s.email || '—',
          phone: s.phone || '—',
          lead: s.lead_time_days ? `${s.lead_time_days} days` : '—',
          status: <StatusPill label={s.is_active ? 'Active' : 'Inactive'} tone={s.is_active ? 'success' : 'neutral'} />,
        },
      }))}
      editHrefBase="/inventory/suppliers/edit"
      deleteAction={deleteAction}
      emptyMessage="No suppliers yet — add one so a restock request can say who is being ordered from."
    />
  );
}
