import { cookies } from 'next/headers';

// Re-export all types from the types file so existing imports still work.
// Client Components must import from '@/lib/admin-types' directly — NOT here,
// because this file uses next/headers which is server-only.
export type {
  Paginated,
  StoreSettings,
  AdminOrder,
  AdminOrderDetail,
  Promotion,
  StorefrontSlide,
  CreativeAsset,
  MarketingCampaign,
  AdminCategory,
  AdminBrand,
  AdminTag,
  AdminAttribute,
  AdminProductImage,
  AdminProductVideo,
  AdminProductStock,
  AdminProduct,
  AdminReview,
  AdminCustomer,
  StockItem,
  InventoryMovement,
  AdminPayment,
  AdminShipment,
  AdminRefund,
  SupportTicket,
  AdminFaq,
  AdminLegalPage,
  AdminPromoPopup,
  AdminCategoryGroup,
  AdminDeal,
  AdminTaxRate,
  AdminPaymentMethodConfig,
  AdminFirebaseConfig,
  AdminMarketingTool,
  AdminStaffRole,
  AdminStaffUser,
  AdminAbandonedCart,
  AdminWarehouse,
  AdminSupplier,
  AdminStockOrderRequest,
  AdminProductVariant,
  AdminAddonGroup,
  AdminAddon,
} from './admin-types';

import type {
  Paginated,
  StoreSettings,
  AdminOrder,
  AdminOrderDetail,
  Promotion,
  StorefrontSlide,
  CreativeAsset,
  MarketingCampaign,
  AdminCategory,
  AdminBrand,
  AdminTag,
  AdminAttribute,
  AdminProduct,
  AdminProductImage,
  AdminProductVideo,
  AdminReview,
  AdminCustomer,
  StockItem,
  InventoryMovement,
  AdminPayment,
  AdminShipment,
  AdminRefund,
  SupportTicket,
  AdminFaq,
  AdminLegalPage,
  AdminPromoPopup,
  AdminCategoryGroup,
  AdminDeal,
  AdminTaxRate,
  AdminPaymentMethodConfig,
  AdminFirebaseConfig,
  AdminMarketingTool,
  AdminStaffRole,
  AdminStaffUser,
  AdminAbandonedCart,
  AdminWarehouse,
  AdminSupplier,
  AdminStockOrderRequest,
  AdminProductVariant,
  AdminAddonGroup,
  AdminAddon,
} from './admin-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export async function getAdminToken() {
  return (await cookies()).get('admin_token')?.value;
}

/**
 * DRF's error body, flattened to one sentence — `{"detail": "…"}` for viewset
 * errors, `{"field": ["…"]}` for validation. Returned pre-formatted (leading
 * ` — `) so the caller can append it, or '' when there's nothing useful.
 */
async function errorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') return ` — ${body.detail}`;
    if (body && typeof body === 'object') {
      const messages = Object.entries(body as Record<string, unknown>)
        .map(([field, value]) => {
          const text = Array.isArray(value) ? value.join(' ') : String(value);
          return field === 'non_field_errors' ? text : `${field}: ${text}`;
        })
        .filter(Boolean);
      if (messages.length) return ` — ${messages.join('; ')}`;
    }
  } catch {
    /* Not JSON (HTML error page, empty body) — the status code is all we have. */
  }
  return '';
}

/** A refused admin API call. `fields` holds the backend's message per field
 *  (`detail` and `non_field_errors` included), so a form can put each one
 *  under the input it belongs to instead of printing one long sentence. The
 *  message is unchanged from before, so callers that only read it still work. */
export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string>,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

function fieldMessages(body: unknown): Record<string, string> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(' ') : String(value),
    ]),
  );
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAdminToken();
  // Multipart bodies (file uploads) must not get a manual Content-Type — fetch
  // sets its own header with the correct boundary.
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.clone().json().catch(() => null);
    throw new AdminApiError(
      `Admin API ${path} failed with ${response.status}${await errorDetail(response)}`,
      response.status,
      fieldMessages(body),
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function loginAdmin(username: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/admin-login/`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) return null;
  return response.json() as Promise<{ token: string; user: { username: string; email: string } }>;
}

// ─── Query helpers ────────────────────────────────────────────────────────────

function buildQS(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// ─── Store settings (white-label onboarding) ───────────────────────────────────

export async function getStoreSettings() {
  return adminFetch<StoreSettings>('/admin/store/settings/');
}

export async function getDashboard() {
  return adminFetch<import('./admin-types').DashboardData>('/admin/dashboard/');
}

export type AdminNotification = {
  id: string;
  type: 'order' | 'payment' | 'stock' | 'shipment' | 'support' | 'alert';
  title: string;
  desc: string;
  created_at: string | null;
  href: string;
};

/** Live feed derived from real records — see apps/analytics/notifications.py. */
export async function getNotifications() {
  return adminFetch<{ results: AdminNotification[]; count: number }>('/admin/notifications/');
}

export async function uploadMedia(data: FormData) {
  return adminFetch<{ url: string }>('/admin/content/uploads/', {
    method: 'POST',
    body: data,
  });
}

export async function updateStoreSettings(payload: Partial<StoreSettings>) {
  return adminFetch<StoreSettings>('/admin/store/settings/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

/** `queue` selects a pipeline stage: finance | warehouse | logistics | transit. */
export async function getOrders(params?: {
  q?: string; status?: string; queue?: OrderQueue; page?: string; page_size?: number;
}) {
  return adminFetch<Paginated<AdminOrder>>(`/admin/orders/${buildQS(params)}`);
}

export type OrderQueue = 'finance' | 'warehouse' | 'logistics' | 'transit';
export type BulkOrderMove = 'approve_payment' | 'mark_packed' | 'dispatch' | 'mark_delivered';

export type BulkOrderResult = {
  action: BulkOrderMove;
  updated: string[];
  failed: { number: string; detail: string }[];
};

/** Advance a batch one stage. Partial success is normal — read `failed`. */
export async function bulkMoveOrders(
  action: BulkOrderMove,
  numbers: string[],
  extra?: Record<string, string | number>,
) {
  return adminFetch<BulkOrderResult>('/admin/orders/bulk/', {
    method: 'POST',
    body: JSON.stringify({ action, numbers, ...(extra ?? {}) }),
  });
}

/** Every stage, queue and exception count in one request. The orders screen
 *  used to fetch nine filtered pages of a single row each to print nine
 *  numbers, and the queue badges had nothing behind them at all. */
export async function getOrderStageCounts() {
  return adminFetch<import('./order-stages').StageCounts>('/admin/orders/stage-counts/');
}

export async function getOrder(number: string) {
  try {
    return await adminFetch<AdminOrderDetail>(`/admin/orders/${number}/`);
  } catch {
    return null;
  }
}

export async function cancelOrder(number: string, reason?: string) {
  return adminFetch<AdminOrderDetail>(`/admin/orders/${number}/cancel/`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export async function refundOrder(
  number: string,
  opts?: { partial?: boolean; restock?: boolean; reason?: string },
) {
  return adminFetch<AdminOrderDetail>(`/admin/orders/${number}/refund/`, {
    method: 'POST',
    body: JSON.stringify(opts ?? {}),
  });
}

export async function setOrderPayment(number: string, status: string, reason?: string) {
  return adminFetch<AdminOrderDetail>(`/admin/orders/${number}/payment/`, {
    method: 'POST',
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
}

export async function setOrderFulfillment(
  number: string,
  status: string,
  opts?: {
    tracking_number?: string; carrier?: string; tracking_url?: string;
    restock?: boolean; reason?: string;
    /* Rewind a stage after a mistake. The backend requires a reason with it. */
    correction?: boolean;
  },
) {
  return adminFetch<AdminOrderDetail>(`/admin/orders/${number}/fulfillment/`, {
    method: 'POST',
    body: JSON.stringify({ status, ...(opts ?? {}) }),
  });
}

export async function holdOrder(number: string, on_hold: boolean, reason?: string) {
  return adminFetch<AdminOrderDetail>(`/admin/orders/${number}/hold/`, {
    method: 'POST',
    body: JSON.stringify({ on_hold, ...(reason ? { reason } : {}) }),
  });
}

export async function addOrderNote(number: string, text: string) {
  return adminFetch<AdminOrderDetail>(`/admin/orders/${number}/notes/`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// ─── Refunds & returns ──────────────────────────────────────────────────────
export async function getRefunds(params?: {
  q?: string; status?: string; kind?: string; page?: string; page_size?: number;
}) {
  return adminFetch<Paginated<AdminRefund>>(`/admin/refunds/${buildQS(params)}`);
}

export async function getRefund(id: number | string) {
  try {
    return await adminFetch<AdminRefund>(`/admin/refunds/${id}/`);
  } catch {
    return null;
  }
}

export async function approveRefund(id: number | string, note?: string) {
  return adminFetch<AdminRefund>(`/admin/refunds/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function rejectRefund(id: number | string, note?: string) {
  return adminFetch<AdminRefund>(`/admin/refunds/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function createRefundRequest(body: {
  order: string; amount?: string | number; kind?: 'refund' | 'return';
  reason?: string; partial?: boolean; restock?: boolean; method?: string;
}) {
  return adminFetch<AdminRefund>('/admin/refunds/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── Support ────────────────────────────────────────────────────────────────
/* The customer assistant's switch. `enabled` is nullable: null means nobody has
   chosen and the deploy's own ASSISTANT_ENABLED governs. The API never returns
   the key, only whether one exists. */
export type AssistantConfig = {
  enabled: boolean | null;
  configured: boolean;
  effective: boolean;
  model: string;
  updated_at: string;
};

export async function getAssistantConfig() {
  return adminFetch<AssistantConfig>('/admin/assistant/');
}

export async function setAssistantEnabled(enabled: boolean) {
  return adminFetch<AssistantConfig>('/admin/assistant/', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function getSupportTickets(params?: { status?: string; q?: string; needs_human?: string; page?: string; page_size?: number }) {
  return adminFetch<Paginated<SupportTicket>>(`/admin/support/tickets/${buildQS(params)}`);
}

export async function getSupportTicket(reference: string) {
  try {
    return await adminFetch<SupportTicket>(`/admin/support/tickets/${reference}/`);
  } catch {
    return null;
  }
}

export async function updateTicket(reference: string, body: { status?: string; priority?: string; needs_human?: boolean }) {
  return adminFetch<SupportTicket>(`/admin/support/tickets/${reference}/update_status/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** Staff reply. `voucherCode` attaches an active promo code, which the
 *  customer sees as a voucher card they can collect in the app. */
export async function replyToTicket(reference: string, body: string, voucherCode?: string) {
  return adminFetch<SupportTicket>(`/admin/support/tickets/${reference}/reply/`, {
    method: 'POST',
    body: JSON.stringify(voucherCode ? { body, voucher_code: voucherCode } : { body }),
  });
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export async function getProducts(params?: { q?: string; status?: string; category__slug?: string; page?: string; page_size?: number }) {
  return adminFetch<Paginated<AdminProduct>>(`/admin/products/${buildQS(params)}`);
}

export async function getProduct(slug: string) {
  try {
    return await adminFetch<AdminProduct>(`/admin/products/${slug}/`);
  } catch {
    return null;
  }
}

export async function createProduct(payload: Record<string, unknown>) {
  return adminFetch<AdminProduct>('/admin/products/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(slug: string, payload: Record<string, unknown>) {
  return adminFetch<AdminProduct>(`/admin/products/${slug}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(slug: string) {
  return adminFetch<void>(`/admin/products/${slug}/`, { method: 'DELETE' });
}

export async function getCategories(params?: { page_size?: number }) {
  return adminFetch<Paginated<AdminCategory>>(`/admin/categories/${buildQS(params)}`);
}

export async function createCategory(payload: Record<string, unknown> | FormData) {
  return adminFetch<AdminCategory>('/admin/categories/', {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export async function updateCategory(slug: string, payload: Record<string, unknown> | FormData) {
  return adminFetch<AdminCategory>(`/admin/categories/${slug}/`, {
    method: 'PATCH',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export async function getBrands(params?: { q?: string; page_size?: number }) {
  return adminFetch<Paginated<AdminBrand>>(`/admin/brands/${buildQS(params)}`);
}
export async function getBrand(slug: string) {
  return adminFetch<AdminBrand>(`/admin/brands/${slug}/`);
}
export async function createBrand(payload: Record<string, unknown> | FormData) {
  return adminFetch<AdminBrand>('/admin/brands/', {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}
export async function updateBrand(slug: string, payload: Record<string, unknown> | FormData) {
  return adminFetch<AdminBrand>(`/admin/brands/${slug}/`, {
    method: 'PATCH',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}
export async function deleteBrand(slug: string) {
  return adminFetch<void>(`/admin/brands/${slug}/`, { method: 'DELETE' });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getTags(params?: { q?: string; page_size?: number }) {
  return adminFetch<Paginated<AdminTag>>(`/admin/tags/${buildQS(params)}`);
}
export async function createTag(payload: { name: string; is_active?: boolean }) {
  return adminFetch<AdminTag>('/admin/tags/', { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateTag(slug: string, payload: Record<string, unknown>) {
  return adminFetch<AdminTag>(`/admin/tags/${slug}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function deleteTag(slug: string) {
  return adminFetch<void>(`/admin/tags/${slug}/`, { method: 'DELETE' });
}

// ─── Attributes ───────────────────────────────────────────────────────────────

export async function getAttributes(params?: { q?: string; page_size?: number }) {
  return adminFetch<Paginated<AdminAttribute>>(`/admin/attributes/${buildQS(params)}`);
}
export async function createAttribute(payload: { name: string; values?: string[]; is_active?: boolean }) {
  return adminFetch<AdminAttribute>('/admin/attributes/', { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateAttribute(slug: string, payload: { name?: string; values?: string[]; is_active?: boolean }) {
  return adminFetch<AdminAttribute>(`/admin/attributes/${slug}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function deleteAttribute(slug: string) {
  return adminFetch<void>(`/admin/attributes/${slug}/`, { method: 'DELETE' });
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getReviews(params?: { is_approved?: boolean; product?: number; rating?: number; page?: string; page_size?: number }) {
  return adminFetch<Paginated<AdminReview>>(`/admin/reviews/${buildQS(params)}`);
}

export async function approveReview(id: number) {
  return adminFetch<AdminReview>(`/admin/reviews/${id}/approve/`, { method: 'POST' });
}

export async function rejectReview(id: number) {
  return adminFetch<AdminReview>(`/admin/reviews/${id}/reject/`, { method: 'POST' });
}

export async function deleteReview(id: number) {
  return adminFetch<void>(`/admin/reviews/${id}/`, { method: 'DELETE' });
}

// ─── Product images ───────────────────────────────────────────────────────────

export async function getProductImages(productId: number) {
  return adminFetch<Paginated<AdminProductImage>>(`/admin/product-images/?product=${productId}&page_size=200`);
}

export async function createProductImage(payload: { product_id: number; source_url: string; alt_text?: string; sort_order?: number; is_primary?: boolean }) {
  return adminFetch<AdminProductImage>('/admin/product-images/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Multipart upload — pass a FormData containing product_id, image (File), and
// optionally alt_text / sort_order. Do not set Content-Type; adminFetch skips
// it automatically for FormData bodies so fetch can add the multipart boundary.
export async function uploadProductImage(formData: FormData) {
  return adminFetch<AdminProductImage>('/admin/product-images/', {
    method: 'POST',
    body: formData,
  });
}

export async function updateProductImage(id: number, payload: Partial<{ source_url: string; alt_text: string; sort_order: number; is_primary: boolean }>) {
  return adminFetch<AdminProductImage>(`/admin/product-images/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProductImage(id: number) {
  return adminFetch<void>(`/admin/product-images/${id}/`, {
    method: 'DELETE',
  });
}

// ─── Product videos ───────────────────────────────────────────────────────────

export async function getProductVideos(productId: number) {
  return adminFetch<Paginated<AdminProductVideo>>(`/admin/product-videos/?product=${productId}&page_size=200`);
}

export async function createProductVideo(payload: { product_id: number; title?: string; video_url: string; thumbnail_url?: string; sort_order?: number }) {
  return adminFetch<AdminProductVideo>('/admin/product-videos/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProductVideo(id: number, payload: Partial<{ title: string; video_url: string; thumbnail_url: string; sort_order: number }>) {
  return adminFetch<AdminProductVideo>(`/admin/product-videos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProductVideo(id: number) {
  return adminFetch<void>(`/admin/product-videos/${id}/`, {
    method: 'DELETE',
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function getCustomers(params?: { q?: string; page?: string; page_size?: number }) {
  return adminFetch<Paginated<AdminCustomer>>(`/admin/customers/${buildQS(params)}`);
}

export async function getCustomer(id: number) {
  try {
    return await adminFetch<AdminCustomer>(`/admin/customers/${id}/`);
  } catch {
    return null;
  }
}

export async function createCustomer(payload: { name: string; email: string; phone?: string; password?: string }) {
  return adminFetch<AdminCustomer>('/admin/customers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(
  id: number,
  payload:
    | Partial<{ name: string; email: string; phone: string; marketing_opt_in: boolean; is_active: boolean }>
    | FormData,
) {
  return adminFetch<AdminCustomer>(`/admin/customers/${id}/`, {
    method: 'PATCH',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

/** Deactivates instead of deleting once the customer has orders (Order FK is PROTECT). */
export async function deleteCustomer(id: number) {
  return adminFetch<void>(`/admin/customers/${id}/`, { method: 'DELETE' });
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function getInventory(params?: { q?: string; ordering?: string; page?: string; page_size?: number }) {
  return adminFetch<Paginated<StockItem>>(`/admin/stock/${buildQS(params)}`);
}

export async function getInventoryMovements(params?: { q?: string; reason?: string; page?: string; page_size?: number }) {
  return adminFetch<Paginated<InventoryMovement>>(`/admin/movements/${buildQS(params)}`);
}

export async function updateStockItem(id: number, payload: { quantity_on_hand?: number; reorder_level?: number; allow_backorder?: boolean; warehouse?: number | null }) {
  return adminFetch<StockItem>(`/admin/stock/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function createInventoryMovement(payload: { product_id: number; variant_id?: number | null; reason: string; quantity_delta: number; reference?: string; note?: string }) {
  return adminFetch<InventoryMovement>('/admin/movements/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(params?: { q?: string; provider?: string; status?: string; page?: string; page_size?: number }) {
  return adminFetch<Paginated<AdminPayment>>(`/admin/payments/${buildQS(params)}`);
}

// ─── Shipping ─────────────────────────────────────────────────────────────────

export async function getShipments(params?: { q?: string; provider?: string; status?: string; page?: string; page_size?: number }) {
  return adminFetch<Paginated<AdminShipment>>(`/admin/shipments/${buildQS(params)}`);
}

export async function createShipment(payload: {
  order_number: string;
  provider: string;
  status?: string;
  tracking_number?: string;
  tracking_url?: string;
  service_name?: string;
}) {
  return adminFetch<AdminShipment>('/admin/shipments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// An order carries one open shipment, so correcting a carrier or a tracking
// number is an update — creating a second one is refused by the API.
export async function updateShipment(id: number, payload: {
  provider?: string;
  status?: string;
  tracking_number?: string;
  tracking_url?: string;
  service_name?: string;
  estimated_delivery_at?: string | null;
  rider_name?: string;
  rider_phone?: string;
  vehicle?: string;
  vehicle_plate?: string;
}) {
  return adminFetch<AdminShipment>(`/admin/shipments/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ─── Promotions ───────────────────────────────────────────────────────────────

export async function getPromotions() {
  return adminFetch<Paginated<Promotion>>('/admin/promotions/');
}

export async function getPromotion(id: number) {
  try {
    return await adminFetch<Promotion>(`/admin/promotions/${id}/`);
  } catch {
    return null;
  }
}

export async function createPromotion(payload: {
  name: string;
  code: string;
  promotion_type: string;
  status: string;
  value: string;
  applies_to: string;
  starts_at?: string;
  ends_at?: string;
  usage_limit?: string;
  min_order_amount?: string;
  product_ids?: number[];
  is_sitewide?: boolean;
}) {
  return adminFetch<Promotion>('/admin/promotions/', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      starts_at: payload.starts_at || null,
      ends_at: payload.ends_at || null,
      usage_limit: payload.usage_limit ? Number(payload.usage_limit) : null,
      // The column is NOT NULL with a 0 default — an empty box means "no minimum".
      min_order_amount: payload.min_order_amount || '0',
      is_sitewide: Boolean(payload.is_sitewide),
    }),
  });
}

export async function updatePromotion(
  id: number,
  payload: Partial<Omit<Promotion, 'products'>> & { product_ids?: number[] },
) {
  return adminFetch<Promotion>(`/admin/promotions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deletePromotion(id: number) {
  return adminFetch<void>(`/admin/promotions/${id}/`, {
    method: 'DELETE',
  });
}

// ─── Content ──────────────────────────────────────────────────────────────────

/** Slides for one placement: the homepage hero (website and app) or the
 *  app's Flash Sale live banner. */
export async function getStorefrontSlides(placement: 'home_hero' | 'offers_live' = 'home_hero') {
  return adminFetch<Paginated<StorefrontSlide>>(`/admin/content/slides/?placement=${placement}`);
}

export async function createStorefrontSlide(payload: Partial<StorefrontSlide>) {
  return adminFetch<StorefrontSlide>('/admin/content/slides/', {
    method: 'POST',
    body: JSON.stringify({
      placement: 'home_hero',
      status: 'draft',
      text_color: '#FFFFFF',
      accent_color: '#FFD166',
      gradient_from: '#0F6E56',
      gradient_to: '#0A4F3E',
      ...payload,
    }),
  });
}

export async function updateStorefrontSlide(id: number, payload: Partial<StorefrontSlide>) {
  return adminFetch<StorefrontSlide>(`/admin/content/slides/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteStorefrontSlide(id: number) {
  return adminFetch<void>(`/admin/content/slides/${id}/`, {
    method: 'DELETE',
  });
}

export async function getCreativeAssets() {
  return adminFetch<Paginated<CreativeAsset>>('/admin/content/creative-assets/');
}

export async function createCreativeAsset(payload: Partial<CreativeAsset>) {
  return adminFetch<CreativeAsset>('/admin/content/creative-assets/', {
    method: 'POST',
    body: JSON.stringify({
      asset_type: 'image',
      source_type: 'external_url',
      status: 'approved',
      ...payload,
    }),
  });
}

export async function getMarketingCampaigns() {
  return adminFetch<Paginated<MarketingCampaign>>('/admin/content/campaigns/');
}

export async function createMarketingCampaign(payload: Record<string, unknown>) {
  return adminFetch<MarketingCampaign>('/admin/content/campaigns/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMarketingCampaign(id: number, payload: Partial<MarketingCampaign>) {
  return adminFetch<MarketingCampaign>(`/admin/content/campaigns/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/* ─── Content: FAQ, legal pages, promo popups ────────────────────────────── */

export async function getFaqs() {
  return adminFetch<Paginated<AdminFaq>>('/admin/content/faqs/?page_size=200');
}
export async function getFaq(id: number) {
  return adminFetch<AdminFaq>(`/admin/content/faqs/${id}/`);
}
export async function createFaq(payload: Record<string, unknown>) {
  return adminFetch<AdminFaq>('/admin/content/faqs/', { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateFaq(id: number, payload: Record<string, unknown>) {
  return adminFetch<AdminFaq>(`/admin/content/faqs/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function deleteFaq(id: number) {
  return adminFetch<void>(`/admin/content/faqs/${id}/`, { method: 'DELETE' });
}

export async function getLegalPages(pageType: 'privacy' | 'terms') {
  return adminFetch<Paginated<AdminLegalPage>>(`/admin/content/legal-pages/?page_type=${pageType}&page_size=200`);
}
export async function getLegalPage(id: number) {
  return adminFetch<AdminLegalPage>(`/admin/content/legal-pages/${id}/`);
}
export async function createLegalPage(payload: Record<string, unknown>) {
  return adminFetch<AdminLegalPage>('/admin/content/legal-pages/', { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateLegalPage(id: number, payload: Record<string, unknown>) {
  return adminFetch<AdminLegalPage>(`/admin/content/legal-pages/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function deleteLegalPage(id: number) {
  return adminFetch<void>(`/admin/content/legal-pages/${id}/`, { method: 'DELETE' });
}

export async function getPromoPopups() {
  return adminFetch<Paginated<AdminPromoPopup>>('/admin/content/promo-popups/?page_size=200');
}
export async function getPromoPopup(id: number) {
  return adminFetch<AdminPromoPopup>(`/admin/content/promo-popups/${id}/`);
}
export async function createPromoPopup(payload: FormData) {
  return adminFetch<AdminPromoPopup>('/admin/content/promo-popups/', { method: 'POST', body: payload });
}
export async function updatePromoPopup(id: number, payload: FormData) {
  return adminFetch<AdminPromoPopup>(`/admin/content/promo-popups/${id}/`, { method: 'PATCH', body: payload });
}
export async function deletePromoPopup(id: number) {
  return adminFetch<void>(`/admin/content/promo-popups/${id}/`, { method: 'DELETE' });
}

/* ─── Category groups ────────────────────────────────────────────────────── */

export async function getCategoryGroups() {
  return adminFetch<Paginated<AdminCategoryGroup>>('/admin/content/category-groups/?page_size=200');
}
export async function getCategoryGroup(id: number) {
  return adminFetch<AdminCategoryGroup>(`/admin/content/category-groups/${id}/`);
}
export async function createCategoryGroup(payload: FormData) {
  return adminFetch<AdminCategoryGroup>('/admin/content/category-groups/', { method: 'POST', body: payload });
}
export async function updateCategoryGroup(id: number, payload: FormData) {
  return adminFetch<AdminCategoryGroup>(`/admin/content/category-groups/${id}/`, { method: 'PATCH', body: payload });
}
export async function deleteCategoryGroup(id: number) {
  return adminFetch<void>(`/admin/content/category-groups/${id}/`, { method: 'DELETE' });
}

/* ─── Deals ──────────────────────────────────────────────────────────────── */

export async function getDeals(params?: { kind?: string; clearance?: string; q?: string }) {
  return adminFetch<Paginated<AdminDeal>>(`/admin/deals/${buildQS({ page_size: 200, ...params })}`);
}
export async function getDeal(id: number) {
  return adminFetch<AdminDeal>(`/admin/deals/${id}/`);
}
export async function createDeal(payload: Record<string, unknown>) {
  return adminFetch<AdminDeal>('/admin/deals/', { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateDeal(id: number, payload: Record<string, unknown>) {
  return adminFetch<AdminDeal>(`/admin/deals/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function deleteDeal(id: number) {
  return adminFetch<void>(`/admin/deals/${id}/`, { method: 'DELETE' });
}

/* ─── Tax rates ──────────────────────────────────────────────────────────── */

export async function getTaxRates() {
  return adminFetch<Paginated<AdminTaxRate>>('/admin/store/tax-rates/?page_size=200');
}
export async function getTaxRate(id: number) {
  return adminFetch<AdminTaxRate>(`/admin/store/tax-rates/${id}/`);
}
export async function createTaxRate(payload: Record<string, unknown>) {
  return adminFetch<AdminTaxRate>('/admin/store/tax-rates/', { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateTaxRate(id: number, payload: Record<string, unknown>) {
  return adminFetch<AdminTaxRate>(`/admin/store/tax-rates/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function deleteTaxRate(id: number) {
  return adminFetch<void>(`/admin/store/tax-rates/${id}/`, { method: 'DELETE' });
}

/* ─── Payment methods ────────────────────────────────────────────────────── */

export async function getPaymentMethods() {
  return adminFetch<Paginated<AdminPaymentMethodConfig>>('/admin/payment-methods/?page_size=200');
}
export async function getPaymentMethod(id: number) {
  return adminFetch<AdminPaymentMethodConfig>(`/admin/payment-methods/${id}/`);
}
export async function createPaymentMethod(payload: FormData) {
  return adminFetch<AdminPaymentMethodConfig>('/admin/payment-methods/', { method: 'POST', body: payload });
}
export async function updatePaymentMethod(id: number, payload: FormData) {
  return adminFetch<AdminPaymentMethodConfig>(`/admin/payment-methods/${id}/`, { method: 'PATCH', body: payload });
}
export async function deletePaymentMethod(id: number) {
  return adminFetch<void>(`/admin/payment-methods/${id}/`, { method: 'DELETE' });
}

/* ─── Integrations ───────────────────────────────────────────────────────── */

export async function getFirebaseConfig() {
  return adminFetch<AdminFirebaseConfig>('/admin/firebase/');
}
export async function updateFirebaseConfig(payload: Record<string, unknown>) {
  return adminFetch<AdminFirebaseConfig>('/admin/firebase/', { method: 'PATCH', body: JSON.stringify(payload) });
}
/** Read one stored credential back. Needs `manage` on integrations, is rate
 *  limited, and writes an audit row naming who read what — so call it only
 *  when someone has actually asked to see the value, never to populate a form. */
export async function revealSecret(integration: string, field: string) {
  return adminFetch<{ value: string }>(
    `/admin/integrations/${integration}/secrets/${field}/reveal/`,
    { method: 'POST' },
  );
}
export async function getMarketingTools() {
  return adminFetch<Paginated<AdminMarketingTool>>('/admin/marketing-tools/?page_size=200');
}
export async function updateMarketingTool(id: number, payload: Record<string, unknown>) {
  return adminFetch<AdminMarketingTool>(`/admin/marketing-tools/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}

/* ─── Staff users and roles ──────────────────────────────────────────────── */

export async function getStaffUsers(params?: { q?: string; is_superuser?: string }) {
  return adminFetch<Paginated<AdminStaffUser>>(`/admin/staff-users/${buildQS({ page_size: 200, ...params })}`);
}
export async function getStaffUser(id: number) {
  return adminFetch<AdminStaffUser>(`/admin/staff-users/${id}/`);
}
export async function createStaffUser(payload: FormData) {
  return adminFetch<AdminStaffUser>('/admin/staff-users/', { method: 'POST', body: payload });
}
export async function updateStaffUser(id: number, payload: FormData) {
  return adminFetch<AdminStaffUser>(`/admin/staff-users/${id}/`, { method: 'PATCH', body: payload });
}
export async function deleteStaffUser(id: number) {
  return adminFetch<void>(`/admin/staff-users/${id}/`, { method: 'DELETE' });
}
export async function getStaffRoles() {
  return adminFetch<AdminStaffRole[]>('/admin/staff-roles/');
}
// Roles are Django groups. The list endpoint was wired up long before anything
// could create one, which left "Select Roles" on the staff form permanently
// offering nothing but "No role".
export type StaffRolePayload = { name: string; access: import('@/lib/admin-access').Access };

export async function createStaffRole(payload: StaffRolePayload) {
  return adminFetch<AdminStaffRole>('/admin/staff-roles/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
export async function updateStaffRole(id: number, payload: StaffRolePayload) {
  return adminFetch<AdminStaffRole>(`/admin/staff-roles/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
/** Who is signed in and what their roles reach; the layout builds the menu from it. */
export async function getAdminMe() {
  return adminFetch<import('@/lib/admin-types').AdminMe>('/auth/admin-me/');
}
export async function deleteStaffRole(id: number) {
  return adminFetch<void>(`/admin/staff-roles/${id}/`, { method: 'DELETE' });
}

/* ─── Abandoned carts ────────────────────────────────────────────────────── */

export async function getAbandonedCarts(params?: { q?: string; status?: string }) {
  return adminFetch<Paginated<AdminAbandonedCart>>(`/admin/abandoned-carts/${buildQS({ page_size: 200, ...params })}`);
}
export async function getAbandonedCart(id: number) {
  return adminFetch<AdminAbandonedCart>(`/admin/abandoned-carts/${id}/`);
}
export async function remindAbandonedCart(id: number) {
  return adminFetch<AdminAbandonedCart>(`/admin/abandoned-carts/${id}/remind/`, { method: 'POST' });
}

/* ─── Inventory operations ───────────────────────────────────────────────── */

export async function getWarehouses() {
  return adminFetch<Paginated<AdminWarehouse>>('/admin/warehouses/?page_size=200');
}
export async function getWarehouse(id: number) {
  return adminFetch<AdminWarehouse>(`/admin/warehouses/${id}/`);
}
export async function createWarehouse(payload: Record<string, unknown>) {
  return adminFetch<AdminWarehouse>('/admin/warehouses/', { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateWarehouse(id: number, payload: Record<string, unknown>) {
  return adminFetch<AdminWarehouse>(`/admin/warehouses/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function deleteWarehouse(id: number) {
  return adminFetch<void>(`/admin/warehouses/${id}/`, { method: 'DELETE' });
}

export async function getSuppliers() {
  return adminFetch<Paginated<AdminSupplier>>('/admin/suppliers/?page_size=200');
}
export async function getSupplier(id: number) {
  return adminFetch<AdminSupplier>(`/admin/suppliers/${id}/`);
}
export async function createSupplier(payload: Record<string, unknown>) {
  return adminFetch<AdminSupplier>('/admin/suppliers/', { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateSupplier(id: number, payload: Record<string, unknown>) {
  return adminFetch<AdminSupplier>(`/admin/suppliers/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function deleteSupplier(id: number) {
  return adminFetch<void>(`/admin/suppliers/${id}/`, { method: 'DELETE' });
}

export async function getStockOrderRequests(params?: { status?: string; q?: string }) {
  return adminFetch<Paginated<AdminStockOrderRequest>>(`/admin/stock-order-requests/${buildQS({ page_size: 200, ...params })}`);
}
export async function createStockOrderRequest(payload: Record<string, unknown>) {
  return adminFetch<AdminStockOrderRequest>('/admin/stock-order-requests/', { method: 'POST', body: JSON.stringify(payload) });
}
export async function receiveStockOrderRequest(id: number) {
  return adminFetch<AdminStockOrderRequest>(`/admin/stock-order-requests/${id}/receive/`, { method: 'POST' });
}

/* ─── Product variants ───────────────────────────────────────────────────── */

export async function getProductVariants(productId: number) {
  return adminFetch<Paginated<AdminProductVariant>>(`/admin/product-variants/?product=${productId}&page_size=200`);
}
export async function createProductVariant(payload: FormData) {
  return adminFetch<AdminProductVariant>('/admin/product-variants/', { method: 'POST', body: payload });
}
export async function getProductVariant(id: number) {
  return adminFetch<AdminProductVariant>(`/admin/product-variants/${id}/`);
}
export async function updateProductVariant(id: number, payload: FormData) {
  return adminFetch<AdminProductVariant>(`/admin/product-variants/${id}/`, { method: 'PATCH', body: payload });
}
export async function deleteProductVariant(id: number) {
  return adminFetch<void>(`/admin/product-variants/${id}/`, { method: 'DELETE' });
}

/* Add-ons: extras offered with a product, priced per unit at checkout. */
export async function getAddonGroups(productId: number) {
  return adminFetch<Paginated<AdminAddonGroup>>(`/admin/addon-groups/?product=${productId}&page_size=100`);
}
export async function createAddonGroup(payload: FormData) {
  return adminFetch<AdminAddonGroup>('/admin/addon-groups/', { method: 'POST', body: payload });
}
export async function updateAddonGroup(id: number, payload: FormData) {
  return adminFetch<AdminAddonGroup>(`/admin/addon-groups/${id}/`, { method: 'PATCH', body: payload });
}
export async function deleteAddonGroup(id: number) {
  return adminFetch<void>(`/admin/addon-groups/${id}/`, { method: 'DELETE' });
}
export async function createAddon(payload: FormData) {
  return adminFetch<AdminAddon>('/admin/addons/', { method: 'POST', body: payload });
}
export async function updateAddon(id: number, payload: FormData) {
  return adminFetch<AdminAddon>(`/admin/addons/${id}/`, { method: 'PATCH', body: payload });
}
export async function deleteAddon(id: number) {
  return adminFetch<void>(`/admin/addons/${id}/`, { method: 'DELETE' });
}

/* ── Push notifications ──────────────────────────────────────────────────── */

export async function getPushOverview() {
  return adminFetch<import('./admin-types').PushOverview>('/admin/push/overview/');
}

export async function getPushCampaigns(params?: { q?: string; status?: string; page?: string }) {
  return adminFetch<Paginated<import('./admin-types').PushCampaign>>(
    `/admin/push/campaigns/${buildQS(params)}`,
  );
}

export async function getPushCampaign(id: number) {
  try {
    return await adminFetch<import('./admin-types').PushCampaign>(`/admin/push/campaigns/${id}/`);
  } catch {
    return null;
  }
}

type PushCampaignInput = Partial<{
  name: string;
  title: string;
  body: string;
  image_url: string;
  link: string;
  audience: string;
  template_key: string;
  status: string;
  scheduled_for: string | null;
  repeat: string;
}>;

export async function createPushCampaign(payload: PushCampaignInput) {
  return adminFetch<import('./admin-types').PushCampaign>('/admin/push/campaigns/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePushCampaign(id: number, payload: PushCampaignInput) {
  return adminFetch<import('./admin-types').PushCampaign>(`/admin/push/campaigns/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deletePushCampaign(id: number) {
  return adminFetch<void>(`/admin/push/campaigns/${id}/`, { method: 'DELETE' });
}

export async function sendPushCampaign(id: number) {
  return adminFetch<{ queued: boolean; campaign: import('./admin-types').PushCampaign }>(
    `/admin/push/campaigns/${id}/send/`,
    { method: 'POST' },
  );
}

export async function duplicatePushCampaign(id: number) {
  return adminFetch<import('./admin-types').PushCampaign>(
    `/admin/push/campaigns/${id}/duplicate/`,
    { method: 'POST' },
  );
}
