import { revalidatePath } from 'next/cache';
import { AlertTriangle, Package, PackageCheck, PackageX, Truck } from 'lucide-react';
import {
  getInventory, getStoreSettings, getSuppliers, getWarehouses,
  createInventoryMovement, createStockOrderRequest, updateStockItem,
} from '@/lib/admin-api';
import OrderStatTile from '@/components/sellzy/order-stat-tile';
import StockGrid from '@/components/inventory/StockGrid';

export const dynamic = 'force-dynamic';

/* The restocking screen.
 *
 * It fetches the whole list once, urgency first, and renders it in one
 * scrolling grid. What it replaces paginated eight rows at a time under 447px
 * of tiles and toolbars, so a single line was visible without scrolling and
 * adding stock to it meant opening a modal and finding the product again in a
 * two-hundred-option select.
 */

function message(error: unknown, fallback: string) {
  const text = error instanceof Error ? error.message : '';
  return text.split(' — ')[1] || fallback;
}

/** Goods have arrived. Positive only — writing stock off keeps its own dialog,
 *  because it is not the same kind of act and should not be one click away. */
async function receiveStockAction(productId: number, quantity: number, variantId?: number) {
  'use server';
  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: 'Enter how many arrived.' };
  }
  try {
    const movement = await createInventoryMovement({
      product_id: productId,
      variant_id: variantId ?? null,
      reason: 'restock',
      quantity_delta: Math.trunc(quantity),
    });
    revalidatePath('/products/stocks');
    return { movementId: movement.id };
  } catch (error) {
    return { error: message(error, 'That could not be added. Try again.') };
  }
}

/** The inverse of a movement just made, for the toast's Undo. Recorded as an
 *  adjustment naming the movement it reverses, so the ledger shows both — the
 *  mistake and the correction — rather than quietly losing the first. */
async function undoMovementAction(movementId: number) {
  'use server';
  const { getInventoryMovements } = await import('@/lib/admin-api');
  try {
    const page = await getInventoryMovements({ page_size: 50 });
    const original = page.results.find((m) => m.id === movementId);
    if (!original) return { error: 'That movement could not be found to undo.' };
    await createInventoryMovement({
      product_id: original.product.id,
      variant_id: original.variant ?? null,
      reason: 'adjustment',
      quantity_delta: -original.quantity_delta,
      note: `Undo of movement #${movementId}`,
    });
  } catch (error) {
    return { error: message(error, 'That could not be undone.') };
  }
  revalidatePath('/products/stocks');
  return {};
}

/* Reorder level and backorders are per-stock-row rules the API has always
   accepted; nothing in the admin could set them until this dialog. */
async function saveStockRulesAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server';
  const id = Number(formData.get('stock_id'));
  if (!id) return { error: 'That stock row could not be identified.' };
  const reorder = Number(formData.get('reorder_level'));
  // An empty select means "no location", which is a real answer and must reach
  // the API as null — sending 0 or '' would have it read as a missing warehouse
  // and rejected rather than cleared.
  const warehouseRaw = String(formData.get('warehouse') ?? '');
  const warehouse = warehouseRaw ? Number(warehouseRaw) : null;
  try {
    await updateStockItem(id, {
      reorder_level: Number.isFinite(reorder) && reorder >= 0 ? Math.trunc(reorder) : 0,
      allow_backorder: formData.get('allow_backorder') === 'on',
      warehouse: warehouse !== null && Number.isFinite(warehouse) ? warehouse : null,
    });
  } catch (error) {
    return { error: message(error, 'Could not save the stock rules.') };
  }
  revalidatePath('/products/stocks');
}



/* One request per line, because that is what the backend models. A line the
   API rejects is named rather than silently dropped: a merchant who picked
   twelve products must not be told "done" when eleven were raised. */
async function createRestockRequestsAction(
  formData: FormData,
): Promise<{ error?: string; created?: number } | void> {
  'use server';
  let lines: { product_id: number; quantity: number }[];
  try {
    lines = JSON.parse(String(formData.get('lines') || '[]'));
  } catch {
    return { error: 'Those lines could not be read. Reload the page and try again.' };
  }
  lines = lines.filter((l) => Number.isFinite(l.product_id) && l.quantity > 0);
  if (lines.length === 0) return { error: 'Set a quantity above zero on at least one line.' };

  const supplier = Number(formData.get('supplier')) || null;
  const warehouse = Number(formData.get('warehouse')) || null;
  const priority = String(formData.get('priority') || 'normal');
  const orderType = String(formData.get('order_type') || 'restock');
  const note = String(formData.get('note') || '').trim();

  const failed: string[] = [];
  let created = 0;
  for (const line of lines) {
    try {
      await createStockOrderRequest({
        product_id: line.product_id,
        quantity: Math.trunc(line.quantity),
        order_type: orderType,
        priority,
        supplier,
        warehouse,
        note,
      });
      created += 1;
    } catch {
      failed.push(String(line.product_id));
    }
  }

  revalidatePath('/inventory');
  revalidatePath('/products/stocks');
  if (failed.length) {
    return {
      created,
      error: `${created} request${created === 1 ? '' : 's'} raised, but ${failed.length} could not be created. Check those products and try again.`,
    };
  }
  return { created };
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ retired?: string }>;
}) {
  /* Whether retired listings are shown lives in the URL rather than in client
     state, so the tiles above the table and the rows inside it are counted
     from one set and cannot drift apart — and so the choice survives a reload
     or a link sent to someone else. */
  const sp = await searchParams;
  const includeRetired = sp?.retired === '1';
  const [page, , suppliersPage, warehousesPage] = await Promise.all([
    // Urgency first, and the whole catalogue in one go: eighty-seven rows is
    // not a paging problem, it is a rendering one.
    getInventory({ ordering: 'urgency', page_size: 500 }),
    getStoreSettings().catch(() => null),
    getSuppliers().catch(() => null),
    getWarehouses().catch(() => null),
  ]);
  /* Vercel ships this app the moment main moves; the backend goes out through
     CI and rsync and lands a minute or two later. For that window the new
     admin is talking to the old API, which serves stock rows without
     `variants` or `open_request` — so they are defaulted here rather than left
     to throw halfway down a render. */
  const allRows = page.results.map((item) => ({
    ...item,
    variants: item.variants ?? [],
    open_request: item.open_request ?? null,
    product: { ...item.product, category_name: item.product.category_name || item.product.category_slug },
  }));

  /* Only what can actually be sold. A draft has never been published and an
     archived listing has been retired — stock added to either sits where no
     shopper can reach it, which is exactly how the Fahari sizes ended up short
     while their retired twins held the goods. They are counted out loud below
     rather than dropped in silence, so a missing row is explained rather than
     mysterious. An older API that does not send `status` is trusted, not
     hidden: guessing a product is retired would be the worse mistake. */
  const sellable = allRows.filter((i) => !i.product.status || i.product.status === 'active');
  const items = includeRetired ? allRows : sellable;
  const hiddenCount = allRows.length - sellable.length;

  const out = items.filter((i) => i.quantity_on_hand <= 0).length;
  const low = items.filter((i) => i.quantity_on_hand > 0 && i.quantity_on_hand <= i.reorder_level).length;
  const onOrder = items.filter((i) => i.open_request).length;

  const tiles = [
    { accent: '1' as const, icon: Package, label: 'Tracked products', value: items.length },
    { accent: '2' as const, icon: PackageCheck, label: 'In stock', value: items.length - out - low },
    { accent: '3' as const, icon: AlertTriangle, label: 'Low stock', value: low },
    { accent: '4' as const, icon: PackageX, label: 'Out of stock', value: out },
    { accent: '6' as const, icon: Truck, label: 'On order', value: onOrder, href: '/inventory' },
  ];

  const categories = [...new Set(items.map((i) => i.product.category_name).filter(Boolean))].sort();

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {tiles.map((tile) => (
          <OrderStatTile
            key={tile.label}
            accent={tile.accent}
            icon={tile.icon}
            label={tile.label}
            value={tile.value.toLocaleString()}
            href={tile.href}
          />
        ))}
      </div>

      <StockGrid
        items={items}
        categories={categories}
        suppliers={(suppliersPage?.results ?? []).map((s) => ({ id: s.id, name: s.name }))}
        warehouses={(warehousesPage?.results ?? []).map((w) => ({ id: w.id, name: w.name, is_default: w.is_default }))}
        hiddenCount={hiddenCount}
        includeRetired={includeRetired}
        receiveAction={receiveStockAction}
        undoAction={undoMovementAction}
        stockRulesAction={saveStockRulesAction}
        restockAction={createRestockRequestsAction}
      />
    </div>
  );
}
