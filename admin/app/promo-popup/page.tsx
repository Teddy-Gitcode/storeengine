import { revalidatePath } from 'next/cache';
import { getPromoPopups, deletePromoPopup } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deletePromoPopup(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The promo could not be deleted.' };
  }
  revalidatePath('/promo-popup');
}

export default async function PromoPopupPage() {
  const page = await getPromoPopups().catch(() => null);
  const popups = page?.results ?? [];

  return (
    <ResourceList
      title="Promo Popup"
      createHref="/promo-popup/add"
      createLabel="Create Promo"
      columns={[
        { key: 'image', label: 'Image' },
        { key: 'title', label: 'Title' },
        { key: 'order', label: 'Short Order' },
        { key: 'kind', label: 'Type' },
        { key: 'status', label: 'Status' },
      ]}
      statusFilter={{ label: 'All status', options: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
      ] }}
      rows={popups.map((p) => ({
        id: p.id,
        search: `${p.title} ${p.kind_label}`,
        status: p.status,
        cells: {
          image: (
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-[#F2F4F7]">
              {p.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.image_url} alt={p.title} className="h-full w-full object-contain p-1" />
                : <span className="text-xs text-gray-500">—</span>}
            </div>
          ),
          title: <span className="font-semibold text-light-primary-text">{p.title}</span>,
          order: <span className="font-dm-sans">{p.sort_order}</span>,
          kind: p.kind_label,
          status: <StatusPill label={p.status_label} tone={p.status === 'published' ? 'success' : 'neutral'} />,
        },
      }))}
      editHrefBase="/promo-popup/edit"
      deleteAction={deleteAction}
      emptyMessage="No promos yet — click “Create Promo” to add one."
    />
  );
}
