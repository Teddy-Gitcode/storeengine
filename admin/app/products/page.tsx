import { revalidatePath } from 'next/cache';
import { createInventoryMovement, deleteProduct, getCategories, getProductVariant, getProducts, getStoreSettings, updateProduct, updateProductVariant } from '@/lib/admin-api';
import ProductsClient from './ProductsClient';

/* Bulk actions for the selection bar. Both take slugs, because that is what
   the product endpoints key on, and both name what they could not do rather
   than reporting a clean sweep — a merchant who selected twenty must not be
   told "done" when eighteen moved. */
/* Inline edits from the products table.
 *
 * Price is a field, so it is written as one. Stock is not: the ledger is what
 * makes a count true, and a variant's number has to move with its product's
 * total or the two drift — the same leak `perform_create` guards against on
 * the API side. So a new quantity becomes a movement for the difference, and
 * the difference is measured against what the row holds *now*, re-read here
 * rather than trusted from a page that may have been open for an hour. */
async function setVariantPriceAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('variant_id'));
  const price = String(formData.get('price') || '').trim();
  if (!id) return { error: 'That size could not be identified.' };
  if (!/^\d+(\.\d{1,2})?$/.test(price)) return { error: 'Enter a price like 138 or 138.50.' };
  try {
    const fd = new FormData();
    fd.set('price', price);
    await updateProductVariant(id, fd);
  } catch {
    return { error: 'That price could not be saved.' };
  }
  revalidatePath('/products');
}

async function setVariantStockAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('variant_id'));
  const target = Number(formData.get('quantity'));
  if (!id) return { error: 'That size could not be identified.' };
  if (!Number.isFinite(target) || target < 0 || !Number.isInteger(target)) {
    return { error: 'Enter a whole number, zero or more.' };
  }
  try {
    const variant = await getProductVariant(id);
    const delta = target - variant.stock_quantity;
    if (delta === 0) return;
    await createInventoryMovement({
      product_id: Number(formData.get('product_id')),
      variant_id: id,
      reason: 'adjustment',
      quantity_delta: delta,
      note: `Set to ${target} from the products list`,
    });
  } catch {
    return { error: 'That count could not be saved.' };
  }
  revalidatePath('/products');
  revalidatePath('/products/stocks');
}

async function bulkSetStatusAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const status = String(formData.get('status') || '');
  if (!['active', 'draft', 'archived'].includes(status)) return { error: 'Pick a status to set.' };
  let slugs: string[];
  try {
    slugs = JSON.parse(String(formData.get('ids') || '[]'));
  } catch {
    return { error: 'That selection could not be read. Reload the page and try again.' };
  }
  let failed = 0;
  for (const slug of slugs) {
    try {
      await updateProduct(slug, { status });
    } catch {
      failed += 1;
    }
  }
  revalidatePath('/products');
  if (failed) return { error: `${slugs.length - failed} updated, ${failed} could not be.` };
}

async function bulkDeleteAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  let slugs: string[];
  try {
    slugs = JSON.parse(String(formData.get('ids') || '[]'));
  } catch {
    return { error: 'That selection could not be read. Reload the page and try again.' };
  }
  let failed = 0;
  for (const slug of slugs) {
    try {
      await deleteProduct(slug);
    } catch {
      failed += 1;
    }
  }
  revalidatePath('/products');
  if (failed) {
    return { error: `${slugs.length - failed} deleted, ${failed} could not be — a product with orders against it cannot be removed.` };
  }
}

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const [page, categories, settings] = await Promise.all([
    getProducts({ page_size: 200 }),
    getCategories({ page_size: 200 }),
    getStoreSettings().catch(() => null),
  ]);
  return (
    <ProductsClient
      initialProducts={page.results}
      categories={categories.results.map((c) => ({ id: c.id, name: c.name }))}
      currencyCode={settings?.currency_code || 'USD'}
      locale={settings?.locale || 'en-US'}
      bulkStatusAction={bulkSetStatusAction}
      bulkDeleteAction={bulkDeleteAction}
      setVariantPriceAction={setVariantPriceAction}
      setVariantStockAction={setVariantStockAction}
    />
  );
}
