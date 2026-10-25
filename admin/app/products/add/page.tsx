import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  getCategories,
  getBrands,
  getTags,
  createInventoryMovement,
  createProduct,
  getProduct,
  updateStockItem,
  uploadProductImage,
  createProductVariant,
} from '@/lib/admin-api';
import NewProductClient from './NewProductClient';

export const dynamic = 'force-dynamic';

type VariantDraft = {
  sku?: string;
  variant_code?: string;
  color?: string;
  size?: string;
  price?: string;
  stock_quantity?: string;
  status?: string;
};

/** DRF surfaces the failure inside the Error message adminFetch builds. */
function readableError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const detail = message.split(' — ')[1];
  return detail || 'The product could not be saved. Check the fields and try again.';
}

async function createProductAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';

  const name = String(formData.get('name') || '').trim();
  if (!name) return { error: 'Give the product a name.' };

  const slug = String(formData.get('slug') || '').trim();
  const compareAt = String(formData.get('compare_at_price') || '').trim();
  const brandId = String(formData.get('brand_id') || '').trim();
  const tagIds = formData.getAll('tag_ids').map(Number).filter(Boolean);

  let created;
  try {
    created = await createProduct({
      name,
      ...(slug ? { slug } : {}),
      sku: String(formData.get('sku') || '').trim(),
      category_id: Number(formData.get('category_id')),
      status: String(formData.get('status') || 'draft'),
      price: String(formData.get('price') || '0'),
      compare_at_price: compareAt ? compareAt : null,
      short_description: String(formData.get('short_description') || ''),
      description: String(formData.get('description') || ''),
      weight_grams: Number(formData.get('weight_grams') || 0),
      hs_code: String(formData.get('hs_code') || '').trim(),
      is_featured: formData.get('is_featured') === 'true',
      is_taxable: formData.get('is_taxable') === 'true',
      brand_id: brandId ? Number(brandId) : null,
      tag_ids: tagIds,
    });
  } catch (err) {
    return { error: readableError(err) };
  }

  /* Photos and variants need the product id, so they follow the create. A
     failure here leaves a saved product — the editor is where it gets fixed. */
  // Duck-typed instead of `instanceof File`: the File global doesn't exist on
  // Node 18, which this server may run under.
  const files = formData
    .getAll('images')
    .filter((f): f is File => typeof f !== 'string' && f !== null && f.size > 0);

  for (const [index, file] of files.entries()) {
    const fd = new FormData();
    fd.set('product_id', String(created.id));
    fd.set('image', file);
    fd.set('sort_order', String(index));
    if (index === 0) fd.set('is_primary', 'true');
    try {
      await uploadProductImage(fd);
    } catch {
      /* Keep the product; the editor's Media card can retry the upload. */
    }
  }

  let drafts: VariantDraft[] = [];
  try {
    drafts = JSON.parse(String(formData.get('variants') || '[]'));
  } catch {
    drafts = [];
  }

  for (const [index, draft] of drafts.entries()) {
    const fd = new FormData();
    fd.set('product_id', String(created.id));
    fd.set('sku', draft.sku ?? '');
    fd.set('variant_code', draft.variant_code ?? '');
    fd.set('color', draft.color ?? '');
    fd.set('size', draft.size ?? '');
    if (draft.price) fd.set('price', draft.price);
    fd.set('stock_quantity', String(draft.stock_quantity ?? '0'));
    fd.set('status', draft.status ?? 'active');
    // Multipart drops unchecked booleans, so is_visible is always explicit.
    fd.set('is_visible', 'true');
    fd.set('sort_order', String(index));
    try {
      await createProductVariant(fd);
    } catch {
      /* Same: the product exists, variants can be re-added in the editor. */
    }
  }

  /* Opening stock for a product sold as one item. A variant carries its own
     count above, so this only applies when there are none. It goes in as a
     restock movement — the ledger stays the record of where stock came from —
     and the reorder level is set on the stock row that movement creates. */
  const opening = Math.trunc(Number(formData.get('opening_stock') || 0));
  const reorder = Math.trunc(Number(formData.get('reorder_level') || 0));
  if (drafts.length === 0 && opening > 0) {
    try {
      await createInventoryMovement({
        product_id: created.id,
        reason: 'restock',
        quantity_delta: opening,
        note: 'Opening stock',
      });
      if (reorder > 0) {
        const fresh = await getProduct(created.slug);
        if (fresh?.stock?.id) await updateStockItem(fresh.stock.id, { reorder_level: reorder });
      }
    } catch {
      /* The product exists; the stock card in the editor sets the count. */
    }
  }

  revalidatePath('/products');
  revalidatePath('/products/stocks');
  redirect(`/products/edit/${created.slug}`);
}

export default async function AddProductPage() {
  const [categories, brands, tags] = await Promise.all([
    getCategories({ page_size: 200 }),
    getBrands({ page_size: 200 }),
    getTags({ page_size: 200 }),
  ]);

  return (
    <NewProductClient
      categories={categories.results}
      brands={brands.results}
      tags={tags.results}
      createAction={createProductAction}
    />
  );
}
