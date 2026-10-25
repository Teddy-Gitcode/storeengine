import { revalidatePath } from 'next/cache';
import { getCategoryGroups, deleteCategoryGroup } from '@/lib/admin-api';
import ResourceList from '@/components/sellzy/resource-list';
import { StatusPill } from '@/components/sellzy/product-ui';

export const dynamic = 'force-dynamic';

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  try {
    await deleteCategoryGroup(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The group could not be deleted.' };
  }
  revalidatePath('/category-groups');
}

export default async function CategoryGroupsPage() {
  const page = await getCategoryGroups().catch(() => null);
  const groups = page?.results ?? [];

  return (
    <ResourceList
      title="Category Groups"
      createHref="/category-groups/add"
      createLabel="Create Group"
      columns={[
        { key: 'background', label: 'Background' },
        { key: 'title', label: 'Title' },
        { key: 'categories', label: 'Categories' },
        { key: 'order', label: 'Short Order' },
        { key: 'status', label: 'Status' },
      ]}
      statusFilter={{
        label: 'All status',
        options: [
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' },
        ],
      }}
      rows={groups.map((g) => ({
        id: g.id,
        search: `${g.title} ${g.subtitle} ${g.categories.map((c) => c.name).join(' ')}`,
        status: g.status,
        cells: {
          background: (
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-[#F2F4F7]">
              {g.background_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.background_image_url} alt={g.title} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-gray-500">—</span>
              )}
            </div>
          ),
          title: (
            <div>
              <span className="font-semibold text-light-primary-text">{g.title}</span>
              {g.subtitle && <p className="text-xs text-light-secondary-text">{g.subtitle}</p>}
            </div>
          ),
          categories: (
            <span className="line-clamp-2 max-w-xs">
              {g.categories.length ? g.categories.map((c) => c.name).join(', ') : '—'}
            </span>
          ),
          order: <span className="font-dm-sans">{g.sort_order}</span>,
          status: <StatusPill label={g.status_label} tone={g.status === 'published' ? 'success' : 'neutral'} />,
        },
      }))}
      editHrefBase="/category-groups/edit"
      deleteAction={deleteAction}
      emptyMessage="No category groups yet — the storefront falls back to a plain grid until you add one."
    />
  );
}
