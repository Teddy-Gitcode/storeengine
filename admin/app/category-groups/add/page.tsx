import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createCategoryGroup, getCategories } from '@/lib/admin-api';
import ResourceForm from '@/components/sellzy/resource-form';
import { groupFields, groupPayload } from '../group-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = groupPayload(formData);
  if (!payload) return { error: 'The title is required.' };
  try {
    await createCategoryGroup(payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the group.' };
  }
  revalidatePath('/category-groups');
  redirect('/category-groups');
}

export default async function AddCategoryGroupPage() {
  const categories = await getCategories({ page_size: 200 }).catch(() => null);

  return (
    <ResourceForm
      title="Create New Category Group"
      backHref="/category-groups"
      submitLabel="Create Group"
      status={{ name: 'status', defaultValue: 'published', publishedValue: 'published', draftValue: 'draft' }}
      fields={groupFields(categories?.results ?? [])}
      action={createAction}
    />
  );
}
