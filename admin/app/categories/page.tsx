import { revalidatePath } from 'next/cache';
import { createCategory, getCategories, updateCategory } from '@/lib/admin-api';
import CategoryRows from './CategoryRows';

export const dynamic = 'force-dynamic';

// Note: no `instanceof File` here — the File global doesn't exist in this
// Node runtime; multipart entries are still File-shaped Blobs.
function categoryImageFrom(formData: FormData): Blob | null {
  const image = formData.get('image');
  if (!image || typeof image === 'string') return null;
  return image.size > 0 ? image : null;
}

async function createCategoryAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const name = String(formData.get('name') || '').trim();
  if (!name) return { error: 'Give the category a name.' };
  const fd = new FormData();
  fd.set('name', name);
  fd.set('description', String(formData.get('description') || '').trim());
  fd.set('sort_order', String(Number(formData.get('sort_order') || 0)));
  fd.set('is_active', 'true');
  const parent = String(formData.get('parent') || '');
  if (parent) fd.set('parent', parent);
  const image = categoryImageFrom(formData);
  if (image) fd.set('image', image);
  try {
    await createCategory(fd);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The category could not be saved.' };
  }
  revalidatePath('/categories');
}

async function updateCategoryAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const slug = String(formData.get('slug') || '');
  if (!slug) return;
  const fd = new FormData();
  if (formData.has('name')) fd.set('name', String(formData.get('name') || '').trim());
  if (formData.has('description')) fd.set('description', String(formData.get('description') || '').trim());
  if (formData.has('sort_order')) fd.set('sort_order', String(Number(formData.get('sort_order') || 0)));
  if (formData.has('is_active')) fd.set('is_active', String(formData.get('is_active')) === 'true' ? 'true' : 'false');
  // Send the parent whenever the form carried the field, blank included: DRF
  // reads an empty multipart value for a nullable relation as null, which is
  // how "None (top-level)" actually detaches a sub-category. Skipping the
  // blank left the old parent in place while the form claimed otherwise.
  if (formData.has('parent')) fd.set('parent', String(formData.get('parent') || ''));
  const image = categoryImageFrom(formData);
  if (image) fd.set('image', image);
  try {
    await updateCategory(slug, fd);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The category could not be saved.' };
  }
  revalidatePath('/categories');
}

export default async function CategoriesPage() {
  const page = await getCategories({ page_size: 200 });
  const categories = page.results;

  return (
    <CategoryRows
      categories={categories}
      createAction={createCategoryAction}
      updateAction={updateCategoryAction}
    />
  );
}
