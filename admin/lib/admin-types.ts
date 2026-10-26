// Pure type definitions — no server-only imports. Safe to use in both
// Server Components and Client Components.

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type StoreSettings = {
  business_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  brand_color: string;
  brand_color_dark: string;
  accent_color: string;
  accent_color_dark: string;
  currency_code: string;
  currency_symbol: string;
  /** Shoppers here pay the base currency; everyone else pays the second one. */
  home_country_code?: string;
  /** Blank switches the second currency off — everyone pays the base. */
  secondary_currency_code?: string;
  secondary_currency_symbol?: string;
  /** One unit of the base currency in the second one. */
  secondary_currency_rate?: string | number;
  locale: string;
  support_email: string;
  support_phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  announcement: string;
  free_shipping_threshold: string;
  flat_shipping_fee: string;
  social_links: { facebook?: string; instagram?: string; x?: string; tiktok?: string };
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image_url: string;
  google_analytics_id: string;
  google_site_verification: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  mobile_hero_video: boolean;
  mobile_holiday_greetings: boolean;
  mobile_sports_themes: boolean;
  /** The mobile app's look: 'classic' (calm, neutral) or 'fresh' (leafy brand gradients). */
  mobile_skin: 'classic' | 'fresh';
  is_onboarded: boolean;
  metadata: Record<string, unknown>;
  updated_at: string;
};

export type DashboardKpi = { value: number; delta: number; currency?: boolean };

export type DashboardData = {
  kpis: {
    total_sales: DashboardKpi;
    total_orders: DashboardKpi;
    total_customers: DashboardKpi;
    shipping_delays: DashboardKpi;
    refund_requests: DashboardKpi;
    stock_products: DashboardKpi;
    abandoned_carts: DashboardKpi;
    payment_failures: DashboardKpi;
  };
  /* Queues with a page behind them, counted with the same predicates those
     pages filter on — see the dashboard endpoint. Optional because an older
     backend does not send it and the panel then hides rather than reading 0. */
  action_required?: {
    payments_to_verify: number;
    to_pack: number;
    to_dispatch: number;
    in_transit: number;
    low_stock: number;
    out_of_stock: number;
    refunds_to_review: number;
    open_tickets: number;
    restock_requests_open: number;
  };
  order_status: { label: string; count: number }[];
  top_countries: { country: string; total: number }[];
  revenue_monthly: { month: string; total: number }[];
  fulfillment: { label: string; count: number; pct: number }[];
  recent_orders: {
    number: string; email: string; placed_at: string; items: number;
    grand_total: number; currency: string; status: string; payment_status: string;
  }[];
};

export type AdminOrder = {
  id: number;
  number: string;
  email: string;
  phone: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  payment_method: string;
  on_hold: boolean;
  cancelled_at: string | null;
  currency: string;
  /** Base prices × this = the amounts below. Lines stay in the base currency. */
  fx_rate: string;
  subtotal: string;
  shipping_total: string;
  discount_total: string;
  tax_total: string;
  grand_total: string;
  placed_at: string | null;
  created_at: string;
  items: { id: number; name: string; sku: string; quantity: number; unit_price: string; line_total: string }[];
  /* Destination — drives the country flag in the admin lists. */
  shipping_country: string;
  shipping_city: string;
  /* Computed by the backend's transition guard, per order — see
     `get_allowed_transitions`. The admin renders its buttons from this rather
     than re-deriving the rules, so the two cannot disagree. */
  allowed_transitions: {
    fulfillment: string[];
    blocked: Record<string, string>;
    corrections: string[];
    can_cancel: boolean;
    cancel_blocked: string;
    can_refund: boolean;
    refund_blocked: string;
    refundable: string;
  };
  /* The append-only record of every status this order has been through. The
     list endpoint serves it too — it is the same serializer — which is what
     lets the list colour a row that has sat at one stage too long. */
  status_events: {
    id: number;
    from_status: string;
    to_status: string;
    reason: string;
    actor: string;
    created_at: string;
  }[];
  /* Sealed-box measurements the warehouse records at Packed. */
  package_weight_grams: number | null;
  package_length_cm: number | null;
  package_width_cm: number | null;
  package_height_cm: number | null;
  packed_at: string | null;
  dispatched_at: string | null;
  metadata: Record<string, unknown>;
};

export type AdminRefund = {
  id: number;
  order_id: number;
  order_number: string;
  order_total: string;
  order_placed_at: string | null;
  currency: string;
  customer: string;
  kind: 'refund' | 'return';
  kind_label: string;
  status: 'requested' | 'approved' | 'rejected';
  status_label: string;
  amount: string;
  partial: boolean;
  restock: boolean;
  reason: string;
  method: string;
  requested_by: string;
  resolved_by: string;
  resolution_note: string;
  created_at: string;
  resolved_at: string | null;
};

export type StaffNote = { text: string; author: string; at: string };

export type SupportReply = {
  id: number;
  author: string;
  is_staff: boolean;
  /* Three-way, because `is_staff` has room for two answers and the thread now
     has three kinds of author. Staff must be able to tell what the assistant
     already told someone before they answer. */
  author_kind: 'customer' | 'staff' | 'ai';
  body: string;
  /* A promo code handed to the customer as a voucher card, read fresh from
     the promotion — `usable` turns false once it ends or is paused. */
  voucher?: {
    code: string;
    name: string;
    promotion_type: string;
    value: string;
    min_order_amount: string;
    ends_at: string | null;
    usable: boolean;
  } | null;
  created_at: string;
};

export type SupportTicket = {
  id: number;
  reference: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  order_number: string;
  status: string;
  priority: string;
  /* A person must look at this — set when the assistant declines to answer or
     the customer asks for a human, cleared when staff reply. Deliberately not
     folded into `status`, which is the merchant's own triage lifecycle. */
  needs_human: boolean;
  /* Whether the last word was the customer's. Replaces the inbox's old badge,
     which lit any open or in-progress thread and so never went out. */
  awaiting_reply: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  replies: SupportReply[];
};

export type AdminOrderDetail = AdminOrder & {
  subtotal: string;
  shipping_total: string;
  discount_total: string;
  tax_total: string;
  notes: string;
};

export type Promotion = {
  id: number;
  name: string;
  code: string;
  promotion_type: string;
  promotion_type_label: string;
  status: string;
  status_label: string;
  value: string;
  applies_to: string;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  usage_remaining: number | null;
  last_used_at: string | null;
  min_order_amount: string | null;
  banner_url: string;
  products: { id: number; name: string; slug: string; price: string; category: string }[];
  revenue: string;
  is_sitewide: boolean;
  metadata: Record<string, unknown>;
};

export type StorefrontSlide = {
  id: number;
  placement: string;
  placement_label: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  cta_label: string;
  cta_href: string;
  image_url: string;
  image_alt: string;
  /** Optional .mp4/.webm played muted behind the slide's gradient. */
  video_url: string;
  /** How strongly the gradient veils the reel, 0–100. */
  video_overlay_opacity: number;
  /** Where the copy sits on a reel slide, e.g. "center-left". */
  text_position: string;
  gradient_from: string;
  gradient_to: string;
  text_color: string;
  accent_color: string;
  status: string;
  status_label: string;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreativeAsset = {
  id: number;
  name: string;
  asset_type: string;
  asset_type_label: string;
  source_type: string;
  source_type_label: string;
  url: string;
  alt_text: string;
  status: string;
  status_label: string;
  usage_notes: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MarketingCampaign = {
  id: number;
  name: string;
  objective: string;
  objective_label: string;
  status: string;
  status_label: string;
  headline: string;
  audience: string;
  budget: string;
  starts_at: string | null;
  ends_at: string | null;
  promotions: { id: number; name: string; code: string; status: string; value: string }[];
  placements: { id: number; title: string; placement: string; status: string }[];
  creative_assets: { id: number; name: string; asset_type: string; url: string; status: string }[];
  impressions: number;
  clicks: number;
  orders: number;
  revenue: string;
  ctr: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  description: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  legacy_id: string;
  created_at: string;
  updated_at: string;
};

export type AdminBrand = {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  banner_url: string;
  website: string;
  sort_order: number;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminTag = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminAttributeValue = { id: number; value: string };

export type AdminAttribute = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  values: AdminAttributeValue[];
  product_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminProductImage = {
  id: number;
  product_id?: number;
  url: string | null;
  source_url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
};

export type AdminProductVideo = {
  id: number;
  product_id?: number;
  title: string;
  video_url: string;
  thumbnail_url: string;
  sort_order: number;
  created_at?: string;
};

export type AdminReview = {
  id: number;
  product: number;
  product_name: string;
  product_slug: string;
  display_name: string;
  rating: number;
  title: string;
  body: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
};

export type AdminProductStock = {
  id: number;
  quantity_on_hand: number;
  reorder_level: number;
  allow_backorder: boolean;
  unit: string;
};

export type AdminProduct = {
  id: number;
  legacy_id: string;
  sku: string;
  name: string;
  slug: string;
  status: string;
  category: { id: number; name: string; slug: string };
  brand: { id: number; name: string; slug: string } | null;
  tags: { id: number; name: string; slug: string }[];
  short_description: string;
  description: string;
  price: string;
  compare_at_price: string | null;
  weight_grams: number;
  hs_code: string;
  is_featured: boolean;
  is_taxable: boolean;
  images: AdminProductImage[];
  videos: AdminProductVideo[];
  variants: AdminProductVariant[];
  stock: AdminProductStock | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdminCustomer = {
  id: number;
  /** Stable external identifier — safe in URLs, emails and support tickets. */
  public_id: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    date_joined: string;
    is_active: boolean;
  };
  phone: string;
  legacy_id: string;
  marketing_opt_in: boolean;
  avatar_url: string;
  orders_count: number;
  addresses: {
    id: number;
    type: string;
    full_name: string;
    phone: string;
    line1: string;
    city: string;
    country_code: string;
    is_default: boolean;
  }[];
  created_at: string;
  updated_at: string;
};

/** A size or flavour with its own count. The storefront checks this, not the
 *  product total, before it lets someone buy — so this is what restocking a
 *  range has to move. */
export type StockVariant = {
  id: number;
  sku: string;
  label: string;
  stock_quantity: number;
  is_visible: boolean;
  status: string;
  status_label: string;
};

export type StockItem = {
  id: number;
  product: {
    id: number;
    name: string;
    sku: string;
    slug: string;
    category_slug: string;
    category_name: string;
    /** Blank for goods that are not ours to brand. */
    brand_name: string;
    status: string;
    price: string;
  };
  quantity_on_hand: number;
  reorder_level: number;
  allow_backorder: boolean;
  unit: string;
  warehouse: number | null;
  warehouse_name: string;
  /** Empty for a product sold as one thing. */
  variants: StockVariant[];
  /** Stock already on its way, so it is not ordered twice. */
  open_request: { reference: string; quantity: number; created_at: string } | null;
  updated_at: string;
};

export type InventoryMovement = {
  id: number;
  product: { id: number; name: string; sku: string };
  /** The option this moved, when the product is sold in several. Both the
   *  variant's own count and the product total move together. */
  variant: number | null;
  variant_label: string;
  reason: string;
  quantity_delta: number;
  reference: string;
  note: string;
  created_at: string;
};

export type AdminPayment = {
  id: number;
  order: { id: number; number: string; status: string; grand_total: string; currency: string };
  provider: string;
  status: string;
  amount: string;
  currency: string;
  provider_reference: string;
  idempotency_key: string;
  failure_reason: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminShipment = {
  id: number;
  order: { id: number; number: string; status: string; email: string; phone: string };
  provider: string;
  status: string;
  tracking_number: string;
  tracking_url: string;
  service_name: string;
  cost: string;
  currency: string;
  estimated_delivery_at: string | null;
  /** The rider card on the app's live-tracking map; empty for a courier. */
  rider_name: string;
  rider_phone: string;
  vehicle: string;
  vehicle_plate: string;
  created_at: string;
  updated_at: string;
};

/* ─── Content: FAQ, legal pages, promo popups ────────────────────────────── */

export type AdminFaq = {
  id: number;
  question: string;
  answer: string;
  status: 'draft' | 'published';
  status_label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AdminLegalPage = {
  id: number;
  page_type: 'privacy' | 'terms';
  page_type_label: string;
  title: string;
  body: string;
  language: string;
  status: 'draft' | 'published';
  status_label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AdminPromoPopup = {
  id: number;
  title: string;
  kind: 'popup' | 'banner';
  kind_label: string;
  image_url: string;
  // What the shopper reads. Blank on promos made before the popup could carry
  // words — those still render as a bare image.
  headline: string;
  body: string;
  cta_label: string;
  link_url: string;
  status: 'draft' | 'published';
  status_label: string;
  frequency: 'every_visit' | 'once_per_session' | 'once_ever';
  frequency_label: string;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/* One panel of the storefront's "Shop by category" section: a few category
   cards over a background image or looping reel. */
export type AdminCategoryGroup = {
  id: number;
  title: string;
  subtitle: string;
  categories: { id: number; name: string; slug: string; description: string; image_url: string }[];
  category_count: number;
  background_image_url: string;
  overlay_color: string;
  text_color: string;
  status: 'draft' | 'published';
  status_label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/* ─── Deals (flash sales, featured deals, clearance) ─────────────────────── */

export type AdminDealProduct = { id: number; name: string; slug: string; price: string; category: string };

export type AdminDeal = {
  id: number;
  title: string;
  kind: 'flash' | 'featured';
  kind_label: string;
  deal_type: 'promo' | 'bogo';
  deal_type_label: string;
  discount_percent: string;
  products: AdminDealProduct[];
  product_count: number;
  /* Presentation of the storefront shelf. Blank = keep the built-in look. */
  headline: string;
  subheadline: string;
  badge_label: string;
  cta_label: string;
  cta_href: string;
  gradient_from: string;
  gradient_to: string;
  text_color: string;
  accent_color: string;
  status: string;
  status_label: string;
  starts_at: string | null;
  ends_at: string | null;
  revenue: string;
  discount_given: string;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

/* ─── Tax, payment methods, integrations ─────────────────────────────────── */

export type AdminTaxRate = {
  id: number;
  name: string;
  location: string;
  rate_type: string;
  rate_type_label: string;
  rate_percent: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type AdminPaymentMethodConfig = {
  id: number;
  name: string;
  body_text: string;
  logo_url: string;
  provider: string;
  provider_label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** What the API says about a stored credential — everything except the
 *  credential. The value itself only ever arrives from a deliberate reveal
 *  request; see `revealSecret` and `components/system/SecretField`. */
export type SecretState = {
  is_set: boolean;
  /** Four characters to recognise it by. For a service-account JSON this is
   *  the tail of its `private_key_id`, never part of the private key. */
  last4: string;
  updated_at: string | null;
  updated_by: string;
};

/** Note what is absent: `api_key`, `web_api_key` and `service_account_json`.
 *  They are write-only at the API and read back through `secrets`. */
export type AdminFirebaseConfig = {
  auth_domain: string;
  project_id: string;
  storage_bucket: string;
  messaging_sender_id: string;
  app_id: string;
  measurement_id: string;
  auth_enabled: boolean;
  phone_auth_enabled: boolean;
  updated_at: string;
  secrets: Record<'service_account_json' | 'api_key' | 'web_api_key', SecretState>;
};

export type AdminMarketingTool = {
  id: number;
  key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  sort_order: number;
  updated_at: string;
};

/* ─── Staff users and roles ──────────────────────────────────────────────── */

export type AdminStaffRole = {
  id: number;
  name: string;
  user_count: number;
  /** {area: 'view' | 'manage'} — see lib/admin-access.ts. */
  access: import('@/lib/admin-access').Access;
};

/** The signed-in staff member (`/auth/admin-me/`). */
export type AdminMe = {
  username: string;
  email: string;
  full_name: string;
  avatar_url: string;
  is_staff: boolean;
  is_superuser: boolean;
  roles: string[];
  access: import('@/lib/admin-access').Access;
};

export type AdminStaffUser = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  roles: { id: number; name: string }[];
  avatar_url: string;
  short_description: string;
  phone: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
};

/* ─── Abandoned carts ────────────────────────────────────────────────────── */

export type AdminAbandonedCartItem = {
  id: number;
  product: number | null;
  name: string;
  sku: string;
  category: string;
  unit_price: string;
  quantity: number;
  line_total: string;
};

export type AdminAbandonedCart = {
  id: number;
  reference: string;
  customer: number | null;
  customer_name: string;
  email: string;
  phone: string;
  status: string;
  status_label: string;
  currency: string;
  subtotal: string;
  item_count: number;
  items: AdminAbandonedCartItem[];
  last_activity_at: string;
  reminder_sent_at: string | null;
  recovered_order: number | null;
  created_at: string;
  updated_at: string;
};

/* ─── Inventory operations ───────────────────────────────────────────────── */

export type AdminWarehouse = {
  id: number;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  // DRF renders DecimalField as a string, and null when never set.
  latitude: string | null;
  longitude: string | null;
  geocode_source: string;
  is_default: boolean;
  is_active: boolean;
  stock_item_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminSupplier = {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  lead_time_days: number;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type AdminStockOrderRequest = {
  id: number;
  reference: string;
  product: { id: number; name: string; sku: string; slug: string; category_slug: string; status: string; price: string };
  variant: number | null;
  variant_label: string;
  supplier: number | null;
  supplier_name: string;
  warehouse: number | null;
  warehouse_name: string;
  quantity: number;
  unit: string;
  order_type: string;
  order_type_label: string;
  priority: string;
  priority_label: string;
  status: string;
  status_label: string;
  stock_level_at_request: number;
  note: string;
  received_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminProductVariant = {
  id: number;
  sku: string;
  variant_code: string;
  color: string;
  size: string;
  image_url: string;
  price: string | null;
  effective_price: string;
  stock_quantity: number;
  is_visible: boolean;
  /** The option a product card leads with until sales say otherwise. */
  is_default: boolean;
  status: string;
  status_label: string;
  label: string;
  sort_order: number;
};

export type PushCampaign = {
  id: number;
  name: string;
  title: string;
  body: string;
  image_url: string;
  link: string;
  audience: string;
  audience_label: string;
  template_key: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  status_label: string;
  scheduled_for: string | null;
  repeat: 'once' | 'daily' | 'weekly' | 'monthly';
  recipients: number;
  sent_count: number;
  failed_count: number;
  error: string;
  /** Devices this campaign's audience covers right now. */
  reach: number;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PushSegment = {
  key: string;
  label: string;
  description: string;
  devices: number;
};

export type PushTemplate = {
  key: string;
  name: string;
  title: string;
  body: string;
  audience: string;
  link: string;
  repeat: PushCampaign['repeat'];
  hint: string;
};

export type PushOverview = {
  /** False until the Firebase service-account credentials are on the server. */
  configured: boolean;
  default_audience: string;
  templates: PushTemplate[];
  segments: PushSegment[];
  devices: { total: number; active: number; signed_in: number };
};

/** One extra offered with a product (see AddonGroup in the backend). */
export interface AdminAddon {
  id: number;
  group_id: number;
  name: string;
  price: string;
  is_active: boolean;
  sort_order: number;
}

/** A set of extras on one product: "Sweeten it", pick one or any. */
export interface AdminAddonGroup {
  id: number;
  product_id: number;
  name: string;
  selection: 'single' | 'multiple';
  selection_label: string;
  required: boolean;
  sort_order: number;
  addons: AdminAddon[];
}
