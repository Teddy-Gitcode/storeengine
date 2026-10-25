import { getDeals } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

/* The template's clearance list is every flash sale and featured deal that has
   finished — hence the "Deal" column naming which list it came from. */
export default async function ClearanceSalePage() {
  const page = await getDeals({ clearance: 'true' }).catch(() => null);
  const deals = page?.results ?? [];

  return (
    <ResourceList
      title="Clearance Sale"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'product', label: 'Product' },
        { key: 'title', label: 'Title' },
        { key: 'discount', label: 'Discount' },
        { key: 'type', label: 'Type' },
        { key: 'deal', label: 'Deal' },
        { key: 'start', label: 'Start Date' },
        { key: 'end', label: 'End Date' },
        { key: 'status', label: 'Status' },
      ]}
      rows={deals.map((d) => ({
        id: d.id,
        search: `${d.title} ${d.products.map((p) => p.name).join(' ')}`,
        cells: {
          id: <span className="whitespace-nowrap">#{d.id}</span>,
          product: d.products[0]?.name ?? '—',
          title: <span className="font-semibold text-light-primary-text">{d.title}</span>,
          discount: <span className="font-dm-sans">{d.discount_percent}%</span>,
          type: d.deal_type_label,
          deal: d.kind_label,
          start: <span className="whitespace-nowrap">{d.starts_at ? new Date(d.starts_at).toLocaleDateString() : '—'}</span>,
          end: <span className="whitespace-nowrap">{d.ends_at ? new Date(d.ends_at).toLocaleDateString() : '—'}</span>,
          status: <StatusPill label={d.status_label} tone="neutral" />,
        },
      }))}
      emptyMessage="Nothing in clearance — deals appear here once they end."
    />
  );
}
