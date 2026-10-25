import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getCategories, getCategoryGroup, updateCategoryGroup } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { groupFields, groupPayload } from '../../group-payload';

export const dynamic = 'force-dynamic';

export default async function EditCategoryGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [group, categories] = await Promise.all([
    getCategoryGroup(Number(id)).catch(() => null),
    getCategories({ page_size: 200 }).catch(() => null),
  ]);
  if (!group) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = groupPayload(formData);
    if (!payload) return { error: 'The title is required.' };
    try {
      await updateCategoryGroup(Number(id), payload);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save the group.' };
    }
    revalidatePath('/category-groups');
    redirect('/category-groups');
  }

  return (
    <ResourceForm
      title="Edit Category Group"
      backHref="/category-groups"
      status={{ name: 'status', defaultValue: group.status, publishedValue: 'published', draftValue: 'draft' }}
      fields={groupFields(categories?.results ?? [], group)}
      action={updateAction}
    />
  );
}
