import { revalidatePath } from 'next/cache';
import { getTaxRates, deleteTaxRate } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deleteTaxRate(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The tax rule could not be deleted.' };
  }
  revalidatePath('/tax');
}

export default async function TaxPage() {
  const page = await getTaxRates().catch(() => null);
  const rates = page?.results ?? [];

  return (
    <ResourceList
      title="Tax"
      createHref="/tax/add"
      createLabel="Create Tax"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Tax Name' },
        { key: 'location', label: 'Location' },
        { key: 'type', label: 'Tax Type' },
        { key: 'rate', label: 'Tax Rate' },
        { key: 'status', label: 'Status' },
        { key: 'date', label: 'Date' },
      ]}
      statusFilter={{ label: 'All status', options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ] }}
      rows={rates.map((r) => ({
        id: r.id,
        search: `${r.name} ${r.location} ${r.rate_type_label}`,
        status: r.is_active ? 'active' : 'inactive',
        cells: {
          id: <span className="whitespace-nowrap">#{r.id}</span>,
          name: <span className="font-semibold text-light-primary-text">{r.name}</span>,
          location: r.location || '—',
          type: r.rate_type_label,
          rate: <span className="font-dm-sans">{r.rate_percent}%</span>,
          status: <StatusPill label={r.is_active ? 'Active' : 'Inactive'} tone={r.is_active ? 'success' : 'neutral'} />,
          date: <span className="whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</span>,
        },
      }))}
      editHrefBase="/tax/edit"
      deleteAction={deleteAction}
      emptyMessage="No tax rules yet — click “Create Tax” to add one."
    />
  );
}
