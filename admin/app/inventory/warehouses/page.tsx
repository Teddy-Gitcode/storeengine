import { revalidatePath } from 'next/cache';
import { getWarehouses, deleteWarehouse } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deleteWarehouse(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'That warehouse could not be deleted.' };
  }
  revalidatePath('/inventory/warehouses');
  revalidatePath('/inventory');
  revalidatePath('/products/stocks');
}

export default async function WarehousesPage() {
  const page = await getWarehouses().catch(() => null);
  const warehouses = page?.results ?? [];

  return (
    <ResourceList
      title="Warehouses"
      createHref="/inventory/warehouses/add"
      createLabel="Add Warehouse"
      columns={[
        { key: 'name', label: 'Warehouse' },
        { key: 'code', label: 'Code' },
        { key: 'location', label: 'Location' },
        { key: 'stock', label: 'Stock Records' },
        { key: 'status', label: 'Status' },
      ]}
      statusFilter={{ label: 'All status', options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ] }}
      rows={warehouses.map((w) => ({
        id: w.id,
        search: `${w.name} ${w.code} ${w.city} ${w.country}`,
        status: w.is_active ? 'active' : 'inactive',
        cells: {
          name: (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-light-primary-text">{w.name}</span>
              {w.is_default && <StatusPill label="Default" tone="success" />}
            </span>
          ),
          code: w.code || '—',
          location: [w.city, w.country].filter(Boolean).join(', ') || '—',
          stock: <span className="font-dm-sans tabular-nums">{w.stock_item_count}</span>,
          status: <StatusPill label={w.is_active ? 'Active' : 'Inactive'} tone={w.is_active ? 'success' : 'neutral'} />,
        },
      }))}
      editHrefBase="/inventory/warehouses/edit"
      deleteAction={deleteAction}
      emptyMessage="No warehouses yet — add one so stock and restock requests can say where the goods are."
    />
  );
}
