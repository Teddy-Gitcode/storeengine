import { revalidatePath } from 'next/cache';
import { getTags, createTag, updateTag, deleteTag } from '@/lib/admin-api';
import CatalogCrud from '@/components/sellzy/catalog-crud';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const name = String(formData.get('name') || '').trim();
  if (!name) return;
  await createTag({ name, is_active: formData.get('is_active') === 'on' });
  revalidatePath('/categories/tags');
}

async function updateAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') || '');
  if (!slug) return;
  await updateTag(slug, {
    name: String(formData.get('name') || '').trim(),
    is_active: formData.get('is_active') === 'on',
  });
  revalidatePath('/categories/tags');
}

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const slug = String(formData.get('slug') || '');
  if (!slug) return;
  try {
    await deleteTag(slug);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The tag could not be deleted.' };
  }
  revalidatePath('/categories/tags');
}

export default async function TagsPage() {
  const page = await getTags({ page_size: 200 }).catch(() => null);
  const items = (page?.results ?? []).map((t) => ({
    slug: t.slug, name: t.name, is_active: t.is_active, product_count: t.product_count,
  }));
  return (
    <CatalogCrud
      title="Tag List"
      singular="Tag"
      variant="tag"
      items={items}
      columns={['Tag Name', 'Slug', 'Products', 'Status', 'Action']}
      createAction={createAction}
      updateAction={updateAction}
      deleteAction={deleteAction}
    />
  );
}
