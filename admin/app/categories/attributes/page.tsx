import { revalidatePath } from 'next/cache';
import { getAttributes, createAttribute, updateAttribute, deleteAttribute } from '@/lib/admin-api';
import CatalogCrud from '@/components/sellzy/catalog-crud';

export const dynamic = 'force-dynamic';

function parseValues(raw: string): string[] {
  return raw.split(',').map((v) => v.trim()).filter(Boolean);
}

async function createAction(formData: FormData) {
  'use server';
  const name = String(formData.get('name') || '').trim();
  if (!name) return;
  await createAttribute({
    name,
    values: parseValues(String(formData.get('values') || '')),
    is_active: formData.get('is_active') === 'on',
  });
  revalidatePath('/categories/attributes');
}

async function updateAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') || '');
  if (!slug) return;
  await updateAttribute(slug, {
    name: String(formData.get('name') || '').trim(),
    values: parseValues(String(formData.get('values') || '')),
    is_active: formData.get('is_active') === 'on',
  });
  revalidatePath('/categories/attributes');
}

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const slug = String(formData.get('slug') || '');
  if (!slug) return;
  try {
    await deleteAttribute(slug);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The attribute could not be deleted.' };
  }
  revalidatePath('/categories/attributes');
}

export default async function AttributesPage() {
  const page = await getAttributes({ page_size: 200 }).catch(() => null);
  const items = (page?.results ?? []).map((a) => ({
    slug: a.slug, name: a.name, is_active: a.is_active, product_count: a.product_count, values: a.values,
  }));
  return (
    <CatalogCrud
      title="Attribute List"
      singular="Attribute"
      variant="attribute"
      items={items}
      columns={['Attribute Name', 'Values', 'Products', 'Status', 'Action']}
      createAction={createAction}
      updateAction={updateAction}
      deleteAction={deleteAction}
    />
  );
}
