import { revalidatePath } from 'next/cache';
import { getBrands, deleteBrand } from '@/lib/admin-api';
import CatalogCrud from '@/components/sellzy/catalog-crud';

export const dynamic = 'force-dynamic';

/* Create and edit live on the dedicated /categories/brands/add and
   /categories/brands/[slug]/edit pages — the only forms that can carry the
   logo, banner, website and sort order. The inline-form pair CatalogCrud
   offers is deliberately not wired up here. */

async function deleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const slug = String(formData.get('slug') || '');
  if (!slug) return;
  try {
    await deleteBrand(slug);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { error: message.split(' — ')[1] || 'The brand could not be deleted.' };
  }
  revalidatePath('/categories/brands');
}

export default async function BrandsPage() {
  const page = await getBrands({ page_size: 200 }).catch(() => null);
  const items = (page?.results ?? []).map((b) => ({
    slug: b.slug, name: b.name, is_active: b.is_active, product_count: b.product_count,
    description: b.description, logo_url: b.logo_url,
  }));
  return (
    <CatalogCrud
      title="Brand List"
      singular="Brand"
      variant="brand"
      items={items}
      columns={['Brand Name', 'Description', 'Products', 'Status', 'Action']}
      deleteAction={deleteAction}
      formHrefBase="/categories/brands"
    />
  );
}
