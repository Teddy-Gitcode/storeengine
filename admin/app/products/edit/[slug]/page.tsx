import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  getProduct,
  getCategories,
  getBrands,
  getTags,
  getReviews,
  getProductImages,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  createProductImage,
  updateProductImage,
  deleteProductImage,
  createProductVideo,
  updateProductVideo,
  deleteProductVideo,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getAddonGroups,
  createAddonGroup,
  updateAddonGroup,
  deleteAddonGroup,
  createAddon,
  updateAddon,
  deleteAddon,
  getStoreSettings,
  approveReview,
  rejectReview,
  updateStockItem,
  createInventoryMovement,
} from '@/lib/admin-api';
import ProductEditorClient from './ProductEditorClient';

export const dynamic = 'force-dynamic';

function revalidateProduct(slug: string) {
  revalidatePath(`/products/edit/${slug}`);
  revalidatePath('/products');
}

/** DRF surfaces the failure inside the Error message adminFetch builds. */
function readableError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : String(err);
  return message.split(' — ')[1] || fallback;
}

/* ─── Details ──────────────────────────────────────────────────────────────── */

/** Returns the server's own message on failure so the form can show it —
 *  a rejected compare-at price used to surface as a crashed page. */
async function saveDetailsAction(_prev: string | null, formData: FormData): Promise<string | null> {
  'use server';
  const slug = String(formData.get('slug'));
  const compareRaw = String(formData.get('compare_at_price') || '').trim();
  const brandRaw = String(formData.get('brand_id') || '').trim();
  try {
    await updateProduct(slug, {
      name: String(formData.get('name') || '').trim(),
      sku: String(formData.get('sku') || '').trim(),
      category_id: Number(formData.get('category_id')),
      status: String(formData.get('status') || 'draft'),
      price: String(formData.get('price') || '0'),
      compare_at_price: compareRaw ? compareRaw : null,
      short_description: String(formData.get('short_description') || ''),
      description: String(formData.get('description') || ''),
      weight_grams: Number(formData.get('weight_grams') || 0),
      hs_code: String(formData.get('hs_code') || '').trim(),
      is_featured: formData.get('is_featured') === 'true',
      is_taxable: formData.get('is_taxable') === 'true',
      brand_id: brandRaw ? Number(brandRaw) : null,
      // The picker posts a marker so an emptied selection still clears the tags
      // instead of reading as "field absent, leave alone".
      ...(formData.get('tag_ids__present')
        ? { tag_ids: formData.getAll('tag_ids').map(Number).filter(Boolean) }
        : {}),
    });
  } catch (err) {
    return readableError(err, 'The product could not be saved. Check the fields and try again.');
  }
  revalidateProduct(slug);
  return null;
}

/* Stock lived only on /products/stocks: a merchant editing a product could see
   the count but not the reorder level, and could not correct the count without
   leaving the page they were already on. Both write paths are the existing
   ones — a movement for the quantity so the ledger stays the record of why it
   moved, a PATCH for the rules. */
async function saveStockAction(_prev: string | null, formData: FormData): Promise<string | null> {
  'use server';
  const slug = String(formData.get('slug'));
  const productId = Number(formData.get('product_id'));
  const stockId = Number(formData.get('stock_id'));
  const delta = Math.trunc(Number(formData.get('quantity_delta') || 0));
  const reorder = Number(formData.get('reorder_level'));

  try {
    if (delta !== 0) {
      await createInventoryMovement({
        product_id: productId,
        reason: String(formData.get('reason') || 'adjustment'),
        quantity_delta: delta,
        note: String(formData.get('note') || '').trim(),
      });
    }
    // A product with no StockItem yet has no row to PATCH; the movement above
    // creates one, but only when the quantity actually moved. Rules on an
    // untracked product are saved once it has a row.
    if (stockId) {
      await updateStockItem(stockId, {
        reorder_level: Number.isFinite(reorder) && reorder >= 0 ? Math.trunc(reorder) : 0,
        allow_backorder: formData.get('allow_backorder') === 'true',
      });
    } else if (delta === 0) {
      return 'This product is not stock-tracked yet. Adjust the quantity first to start tracking it.';
    }
  } catch (err) {
    return readableError(err, 'The stock could not be saved. Check the values and try again.');
  }
  revalidateProduct(slug);
  revalidatePath('/products/stocks');
  return null;
}

async function deleteProductAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const slug = String(formData.get('slug'));
  try {
    await deleteProduct(slug);
  } catch (err) {
    return {
      error: readableError(
        err,
        'The product could not be deleted. Set its status to archived instead.',
      ),
    };
  }
  revalidatePath('/products');
  redirect('/products');
}

/* ─── Variants ─────────────────────────────────────────────────────────────── */

async function createVariantAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const fd = new FormData();
  fd.set('product_id', String(formData.get('product_id')));
  for (const field of ['sku', 'variant_code', 'color', 'size'] as const) {
    fd.set(field, String(formData.get(field) || '').trim());
  }
  const price = String(formData.get('price') || '').trim();
  if (price) fd.set('price', price);
  fd.set('stock_quantity', String(formData.get('stock_quantity') || '0'));
  // Multipart drops unchecked checkboxes, so the boolean is always explicit.
  fd.set('is_visible', formData.get('is_visible') === 'true' ? 'true' : 'false');
  const image = formData.get('image') as Blob | string | null;
  if (image && typeof image !== 'string' && image.size > 0) fd.set('image', image);
  await createProductVariant(fd);
  revalidateProduct(slug);
}

async function updateVariantAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const fd = new FormData();
  for (const field of ['sku', 'variant_code', 'color', 'size', 'price', 'stock_quantity', 'status'] as const) {
    const value = formData.get(field);
    if (value !== null) fd.set(field, String(value));
  }
  for (const flag of ['is_visible', 'is_default'] as const) {
    if (formData.get(flag) !== null) {
      fd.set(flag, formData.get(flag) === 'true' ? 'true' : 'false');
    }
  }
  await updateProductVariant(Number(formData.get('id')), fd);
  revalidateProduct(slug);
}

async function deleteVariantAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  await deleteProductVariant(Number(formData.get('id')));
  revalidateProduct(slug);
}

/* ─── Add-ons ──────────────────────────────────────────────────────────────── */

async function createAddonGroupAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const fd = new FormData();
  fd.set('product_id', String(formData.get('product_id')));
  fd.set('name', String(formData.get('name') || '').trim());
  fd.set('selection', formData.get('selection') === 'single' ? 'single' : 'multiple');
  fd.set('required', formData.get('required') === 'true' ? 'true' : 'false');
  fd.set('sort_order', String(formData.get('sort_order') || '0'));
  await createAddonGroup(fd);
  revalidateProduct(slug);
}

async function updateAddonGroupAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const fd = new FormData();
  for (const field of ['name', 'selection'] as const) {
    const value = formData.get(field);
    if (value !== null) fd.set(field, String(value));
  }
  if (formData.get('required') !== null) {
    fd.set('required', formData.get('required') === 'true' ? 'true' : 'false');
  }
  await updateAddonGroup(Number(formData.get('id')), fd);
  revalidateProduct(slug);
}

async function deleteAddonGroupAction(formData: FormData) {
  'use server';
  await deleteAddonGroup(Number(formData.get('id')));
  revalidateProduct(String(formData.get('slug')));
}

async function createAddonAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const fd = new FormData();
  fd.set('group_id', String(formData.get('group_id')));
  fd.set('name', String(formData.get('name') || '').trim());
  fd.set('price', String(formData.get('price') || '0').trim() || '0');
  fd.set('is_active', 'true');
  fd.set('sort_order', String(formData.get('sort_order') || '0'));
  await createAddon(fd);
  revalidateProduct(slug);
}

async function updateAddonAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const fd = new FormData();
  for (const field of ['name', 'price'] as const) {
    const value = formData.get(field);
    if (value !== null) fd.set(field, String(value));
  }
  if (formData.get('is_active') !== null) {
    fd.set('is_active', formData.get('is_active') === 'true' ? 'true' : 'false');
  }
  await updateAddon(Number(formData.get('id')), fd);
  revalidateProduct(slug);
}

async function deleteAddonAction(formData: FormData) {
  'use server';
  await deleteAddon(Number(formData.get('id')));
  revalidateProduct(String(formData.get('slug')));
}

/* ─── Photos ───────────────────────────────────────────────────────────────── */

async function uploadPhotoAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  // Duck-typed instead of `instanceof File`: the File global doesn't exist on
  // Node 18, which this server may run under.
  const file = formData.get('image') as Blob | string | null;
  if (!file || typeof file === 'string' || file.size === 0) return;
  const fd = new FormData();
  fd.set('product_id', String(formData.get('product_id')));
  fd.set('image', file);
  fd.set('alt_text', String(formData.get('alt_text') || ''));
  fd.set('sort_order', String(formData.get('sort_order') || '0'));
  await uploadProductImage(fd);
  revalidateProduct(slug);
}

async function addPhotoUrlAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const url = String(formData.get('source_url') || '').trim();
  if (!url) return;
  await createProductImage({
    product_id: Number(formData.get('product_id')),
    source_url: url,
    alt_text: String(formData.get('alt_text') || ''),
    sort_order: Number(formData.get('sort_order') || 0),
  });
  revalidateProduct(slug);
}

async function savePhotoAltAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  await updateProductImage(Number(formData.get('id')), {
    alt_text: String(formData.get('alt_text') || ''),
  });
  revalidateProduct(slug);
}

async function setPrimaryPhotoAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const id = Number(formData.get('id'));
  const productId = Number(formData.get('product_id'));
  const images = await getProductImages(productId);
  await Promise.all(
    images.results.map((img) => updateProductImage(img.id, { is_primary: img.id === id })),
  );
  revalidateProduct(slug);
}

async function reorderPhotosAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const ids = String(formData.get('ids') || '')
    .split(',')
    .map(Number)
    .filter(Boolean);
  await Promise.all(ids.map((id, index) => updateProductImage(id, { sort_order: index })));
  revalidateProduct(slug);
}

async function deletePhotoAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  await deleteProductImage(Number(formData.get('id')));
  revalidateProduct(slug);
}

/* ─── Videos ───────────────────────────────────────────────────────────────── */

async function addVideoAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const videoUrl = String(formData.get('video_url') || '').trim();
  if (!videoUrl) return;
  await createProductVideo({
    product_id: Number(formData.get('product_id')),
    title: String(formData.get('title') || ''),
    video_url: videoUrl,
    thumbnail_url: String(formData.get('thumbnail_url') || '').trim(),
    sort_order: Number(formData.get('sort_order') || 0),
  });
  revalidateProduct(slug);
}

async function saveVideoAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const videoUrl = String(formData.get('video_url') || '').trim();
  if (!videoUrl) return;
  await updateProductVideo(Number(formData.get('id')), {
    title: String(formData.get('title') || ''),
    video_url: videoUrl,
    thumbnail_url: String(formData.get('thumbnail_url') || '').trim(),
  });
  revalidateProduct(slug);
}

async function reorderVideosAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const ids = String(formData.get('ids') || '')
    .split(',')
    .map(Number)
    .filter(Boolean);
  await Promise.all(ids.map((id, index) => updateProductVideo(id, { sort_order: index })));
  revalidateProduct(slug);
}

async function deleteVideoAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  await deleteProductVideo(Number(formData.get('id')));
  revalidateProduct(slug);
}

/* ─── Reviews ──────────────────────────────────────────────────────────────── */

async function approveReviewAction(formData: FormData) {
  'use server';
  await approveReview(Number(formData.get('id')));
  revalidateProduct(String(formData.get('slug')));
}

async function rejectReviewAction(formData: FormData) {
  'use server';
  await rejectReview(Number(formData.get('id')));
  revalidateProduct(String(formData.get('slug')));
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default async function ProductEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [categories, brands, tags, reviews, addonGroups, settings] = await Promise.all([
    getCategories({ page_size: 200 }),
    getBrands({ page_size: 200 }),
    getTags({ page_size: 200 }),
    getReviews({ product: product.id, page_size: 200 }),
    getAddonGroups(product.id),
    getStoreSettings().catch(() => null),
  ]);

  return (
    <ProductEditorClient
      product={product}
      categories={categories.results}
      brands={brands.results}
      tags={tags.results}
      reviews={reviews.results}
      saveDetailsAction={saveDetailsAction}
      saveStockAction={saveStockAction}
      deleteProductAction={deleteProductAction}
      createVariantAction={createVariantAction}
      updateVariantAction={updateVariantAction}
      deleteVariantAction={deleteVariantAction}
      addonGroups={addonGroups.results}
      currency={settings?.currency_symbol || settings?.currency_code || ''}
      createAddonGroupAction={createAddonGroupAction}
      updateAddonGroupAction={updateAddonGroupAction}
      deleteAddonGroupAction={deleteAddonGroupAction}
      createAddonAction={createAddonAction}
      updateAddonAction={updateAddonAction}
      deleteAddonAction={deleteAddonAction}
      uploadPhotoAction={uploadPhotoAction}
      addPhotoUrlAction={addPhotoUrlAction}
      savePhotoAltAction={savePhotoAltAction}
      setPrimaryPhotoAction={setPrimaryPhotoAction}
      reorderPhotosAction={reorderPhotosAction}
      deletePhotoAction={deletePhotoAction}
      addVideoAction={addVideoAction}
      saveVideoAction={saveVideoAction}
      reorderVideosAction={reorderVideosAction}
      deleteVideoAction={deleteVideoAction}
      approveReviewAction={approveReviewAction}
      rejectReviewAction={rejectReviewAction}
    />
  );
}
