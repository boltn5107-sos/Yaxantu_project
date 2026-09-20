export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const API_ROOT = API_URL.replace(/\/api\/?$/, "");

// ── Enveloppes API -----------------------------------------------------

export type ApiEnvelope<T> = {
  data: T;
  message?: string;
  links?: Record<string, string | null>;
  meta?: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
};

export type ApiError = Error & {
  status?: number;
  errors?: Record<string, string[]>;
};

// ── Types du catalogue --------------------------------------------------

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  is_main: boolean;
  products_count: number;
  children?: Category[];
};

export type SellerSummary = {
  id: number;
  shop_name: string;
  slug: string;
  logo: string | null;
  verification_level: number;
  verified: boolean;
};

export type CategorySummary = {
  id: number;
  slug: string;
  name: string;
};

export type ProductImage = {
  id: number;
  path: string;
  alt_text: string | null;
  is_primary: boolean;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  price: number;
  currency: string;
  stock_quantity: number;
  in_stock: boolean;
  rating_average: number;
  rating_count: number;
  is_featured: boolean;
  is_active: boolean;
  requires_shipping: boolean;
  thumbnail: string | null;
  images: ProductImage[];
  seller: SellerSummary | null;
  category: CategorySummary | null;
  created_at: string | null;
};

export type ProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "popular";

export type ProductFilters = {
  q?: string;
  category?: string;
  seller?: string;
  min_price?: number;
  max_price?: number;
  featured?: boolean;
  in_stock?: boolean;
  verified?: boolean;
  sort?: ProductSort;
  per_page?: number;
  page?: number;
};

// ── Types du compte / commerce ------------------------------------------

export type User = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  phone_verified_at: string | null;
  locale: string | null;
  avatar: string | null;
  status: string;
  roles: string[];
  profile_type: string | null;
  needs_profile_choice: boolean;
  settings: {
    voice_mode: boolean;
    large_text: boolean;
    helper_mode: boolean;
    notify_voice: boolean;
    notify_sms: boolean;
    notify_inapp: boolean;
  };
  security: {
    pin_configured: boolean;
    biometric_enabled: boolean;
  };
  seller: {
    id: number;
    shop_name: string;
    slug: string;
    status: string;
    is_onboarded: boolean;
    onboarding_step: number;
    logo: string | null;
    trust_score: number;
  } | null;
  courier: {
    id: number;
    status: string;
    is_onboarded: boolean;
    onboarding_step: number;
    available: boolean;
    transport_type: string | null;
    approved: boolean;
  } | null;
  created_at: string | null;
};

export type CartProduct = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  seller: string | null;
  seller_slug: string | null;
  in_stock: boolean;
};

export type CartItem = {
  id: number;
  product_id: number;
  product: CartProduct | null;
  quantity: number;
  unit_price: number;
  total: number;
  requires_shipping: boolean;
};

export type Cart = {
  id: number | null;
  status: string;
  currency: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  count: number;
};

export type Address = {
  id: number;
  type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state_province: string | null;
  postal_code: string | null;
  country_code: string;
  phone: string | null;
  is_default: boolean;
  label: string;
};

export type CheckoutPayload = {
  address?: {
    first_name?: string;
    last_name?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state_province?: string;
    postal_code?: string;
    country_code?: string;
    phone?: string;
  };
  shipping_address_id?: number;
  payment_method: string;
  mobile_money_phone?: string;
  mobile_money_provider?: string;
  shipping_approved?: boolean;
  notes?: string;
};

export type CheckoutPayment = {
  id: number;
  order_id: number;
  transaction_id: string | null;
  method: string;
  status: string;
};

export type CheckoutResponse = {
  message?: string;
  data: Order[];
  payments: CheckoutPayment[];
};

export type OrderItem = {
  id: number;
  product_id: number;
  name: string;
  slug: string | null;
  image: string | null;
  seller: string | null;
  quantity: number;
  unit_price: number;
  total: number;
};

export type OrderPayment = {
  id: number;
  method: string;
  method_label: string;
  status: string;
  status_label: string;
  amount: number;
  currency: string;
  transaction_id: string | null;
  provider: string | null;
  paid_at: string | null;
};

export type OrderDelivery = {
  status: string;
  provider: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
};

export type Order = {
  id: number;
  order_number: string;
  status: string;
  status_label: string;
  payment_status: string;
  shipping_status: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  placed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  tracking_number: string | null;
  items_count: number;
  items: OrderItem[];
  address: Address | null;
  payment: OrderPayment | null;
  delivery: OrderDelivery | null;
};

export type PaymentMethod = {
  id: string;
  label: string;
  description: string;
};

export type Review = {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  status: string;
  author: string;
  is_verified_purchase: boolean;
  created_at: string | null;
};

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  action_url: string | null;
  action_text: string | null;
  priority: string;
  created_at: string | null;
};

// ── Client HTTP ---------------------------------------------------------

let csrfPromise: Promise<void> | null = null;

function xsrfToken(): string {
  const match = /(?:^|;\s*)XSRF-TOKEN=([^;]*)/.exec(document.cookie);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Récupère le cookie XSRF-TOKEN (Sanctum) nécessaire aux requêtes mutantes
 * d'une SPA authentifiée par cookie de session.
 */
function fetchCsrfToken(): Promise<void> {
  if (!csrfPromise) {
    csrfPromise = fetch(`${API_ROOT}/sanctum/csrf-cookie`, {
      credentials: "include",
    })
      .then(() => undefined)
      .catch((err) => {
        csrfPromise = null;
        throw err;
      });
  }
  return csrfPromise;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers({
    Accept: "application/json",
    ...Object.fromEntries(
      new Headers(init?.headers ?? {}).entries(),
    ),
  });

  if (method !== "GET" && typeof document !== "undefined") {
    await fetchCsrfToken();
    const token = xsrfToken();
    if (token) headers.set("X-XSRF-TOKEN", token);
  }
  if (
    init?.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (response.status === 419 && !retried) {
    csrfPromise = null;
    return apiFetch(path, init, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body?.message ??
      `Erreur serveur (${response.status}) pendant la requête ${path}.`;
    const error = new Error(message) as ApiError;
    error.status = response.status;
    if (body?.errors) error.errors = body.errors;
    throw error;
  }

  return (await response.json()) as T;
}

function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }

  const qs = search.toString();

  return qs ? `?${qs}` : "";
}

// ── Catalogue -----------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  const envelope = await apiFetch<ApiEnvelope<Category[]>>("/v1/categories");
  return envelope.data;
}

export async function getProducts(
  filters: ProductFilters = {},
): Promise<Product[]> {
  const query = toQueryString(filters as unknown as Record<string, unknown>);
  const envelope = await apiFetch<ApiEnvelope<Product[]>>(
    `/v1/products${query}`,
  );
  return envelope.data;
}

export async function getProduct(slug: string): Promise<Product> {
  const envelope = await apiFetch<ApiEnvelope<Product>>(
    `/v1/products/${encodeURIComponent(slug)}`,
  );
  return envelope.data;
}

// ── Authentification (SPA cookie) ---------------------------------------

export async function register(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
}): Promise<User> {
  const envelope = await apiFetch<ApiEnvelope<User>>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function login(input: {
  email: string;
  password: string;
  remember?: boolean;
}): Promise<User> {
  const envelope = await apiFetch<ApiEnvelope<User>>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function logout(): Promise<void> {
  await apiFetch<unknown>("/v1/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<User> {
  const envelope = await apiFetch<ApiEnvelope<User>>("/v1/me");
  return envelope.data;
}

// ── Panier ---------------------------------------------------------------

const EMPTY_CART: Cart = {
  id: null,
  status: "active",
  currency: "XOF",
  items: [],
  subtotal: 0,
  shipping: 0,
  total: 0,
  count: 0,
};

export async function getCart(): Promise<Cart> {
  const envelope = await apiFetch<ApiEnvelope<Cart>>("/v1/cart");
  return envelope.data ?? EMPTY_CART;
}

export async function addToCart(
  productId: number,
  quantity = 1,
): Promise<Cart> {
  const envelope = await apiFetch<ApiEnvelope<Cart>>("/v1/cart/items", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
  return envelope.data;
}

export async function updateCartItem(
  itemId: number,
  quantity: number,
): Promise<Cart> {
  const envelope = await apiFetch<ApiEnvelope<Cart>>(
    `/v1/cart/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    },
  );
  return envelope.data;
}

export async function removeCartItem(itemId: number): Promise<Cart> {
  const envelope = await apiFetch<ApiEnvelope<Cart>>(
    `/v1/cart/items/${itemId}`,
    { method: "DELETE" },
  );
  return envelope.data;
}

export async function clearCart(): Promise<void> {
  await apiFetch<unknown>("/v1/cart", { method: "DELETE" });
}

// ── Adresses -------------------------------------------------------------

export async function getAddresses(): Promise<Address[]> {
  const envelope = await apiFetch<ApiEnvelope<Address[]>>("/v1/addresses");
  return envelope.data;
}

// ── Checkout & commandes -------------------------------------------------

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const envelope = await apiFetch<ApiEnvelope<PaymentMethod[]>>(
    "/v1/payment-methods",
  );
  return envelope.data;
}

export async function checkout(
  payload: CheckoutPayload,
): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>("/v1/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrders(): Promise<Order[]> {
  const envelope = await apiFetch<ApiEnvelope<Order[]>>("/v1/orders");
  return envelope.data;
}

export async function getOrder(orderNumber: string): Promise<Order> {
  const envelope = await apiFetch<ApiEnvelope<Order>>(
    `/v1/orders/${encodeURIComponent(orderNumber)}`,
  );
  return envelope.data;
}

export async function cancelOrder(
  orderNumber: string,
  reason?: string,
): Promise<Order> {
  const envelope = await apiFetch<ApiEnvelope<Order>>(
    `/v1/orders/${encodeURIComponent(orderNumber)}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
  return envelope.data;
}

// ── Favoris --------------------------------------------------------------

export async function getFavorites(): Promise<Product[]> {
  const envelope = await apiFetch<ApiEnvelope<Product[]>>("/v1/favorites");
  return envelope.data;
}

export async function addFavorite(productId: number): Promise<void> {
  await apiFetch<unknown>(`/v1/favorites/${productId}`, { method: "POST" });
}

export async function removeFavorite(productId: number): Promise<void> {
  await apiFetch<unknown>(`/v1/favorites/${productId}`, { method: "DELETE" });
}

// ── Avis -----------------------------------------------------------------

export async function getProductReviews(slug: string): Promise<Review[]> {
  const envelope = await apiFetch<ApiEnvelope<Review[]>>(
    `/v1/products/${encodeURIComponent(slug)}/reviews`,
  );
  return envelope.data;
}

export async function submitReview(
  slug: string,
  input: { rating: number; title?: string; content?: string },
): Promise<Review> {
  const envelope = await apiFetch<ApiEnvelope<Review>>(
    `/v1/products/${encodeURIComponent(slug)}/reviews`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return envelope.data;
}

// ── Notifications ---------------------------------------------------------

export async function getNotifications(): Promise<AppNotification[]> {
  const envelope = await apiFetch<ApiEnvelope<AppNotification[]>>(
    "/v1/notifications",
  );
  return envelope.data;
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const envelope = await apiFetch<ApiEnvelope<{ count: number }>>(
    "/v1/notifications/unread-count",
  );
  return envelope.data.count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await apiFetch<unknown>(`/v1/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<unknown>("/v1/notifications/read-all", {
    method: "PATCH",
  });
}

// ═══════════════════ Phase 3 : téléphone, vendeur, livreur, paramètres ═══

// ── Auth téléphone (code SMS / voix) -------------------------------------

export type PhoneCodeRequest = {
  message: string;
  phone: string;
  expires_in_seconds: number;
  dev_code: string | null;
};

export type ProfileType = "buyer" | "seller" | "delivery";

export async function requestPhoneCode(
  phone: string,
  deviceId?: string,
): Promise<PhoneCodeRequest> {
  return apiFetch<PhoneCodeRequest>("/v1/auth/phone/request-code", {
    method: "POST",
    body: JSON.stringify({ phone, device_id: deviceId }),
  });
}

export async function verifyPhoneCode(
  phone: string,
  code: string,
  name?: string,
): Promise<User> {
  const envelope = await apiFetch<ApiEnvelope<User>>("/v1/auth/phone/verify-code", {
    method: "POST",
    body: JSON.stringify({ phone, code, name }),
  });
  return envelope.data;
}

export async function chooseProfile(
  type: ProfileType,
): Promise<User> {
  const envelope = await apiFetch<ApiEnvelope<User>>("/v1/auth/profile", {
    method: "POST",
    body: JSON.stringify({ type }),
  });
  return envelope.data;
}

/**
 * Où emmener un utilisateur connecté selon son profil :
 * un vendeur sans boutique doit d'abord créer sa boutique,
 * un livreur sans dossier doit d'abord le créer.
 */
export function landingPathFor(user: User | null): string {
  if (!user) return "/";
  if (
    user.profile_type === "seller" &&
    user.seller &&
    !user.seller.is_onboarded
  ) {
    return "/seller/onboarding";
  }
  if (
    user.profile_type === "delivery" &&
    user.courier &&
    !user.courier.is_onboarded
  ) {
    return "/delivery/onboarding";
  }
  return "/";
}

// ── Vendeur : onboarding / commandes / finances / analyse -----------------

export type SellerOnboardingProgress = {
  steps: number;
  current_step: number;
  is_onboarded: boolean;
  status: string;
  shop_name: string | null;
  main_category_id: number | null;
  location: {
    lat: string | null;
    lng: string | null;
    address: string | null;
  } | null;
  payout: { method: string | null; account: string | null } | null;
  sponsor: { shop_name: string | null; slug: string | null } | null;
  trust_score: number;
};

export type SellerStepResult = {
  message: string;
  data: {
    current_step: number;
    is_onboarded: boolean;
    next_step: number | null;
  };
};

export type SellerOrderItem = {
  id: number;
  name: string;
  image: string | null;
  quantity: number;
  total: number;
};

export type SellerOrderSummary = {
  order_number: string;
  status: string;
  status_label: string;
  status_color: string;
  payment_status: string;
  placed_at: string | null;
  buyer: { name: string | null; phone: string | null };
  items: SellerOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  commission: number;
  disputed: boolean;
};

export type SellerOrderDetail = SellerOrderSummary & {
  detail: {
    sale_price: number;
    shipping: number;
    platform_commission: number;
    payment_fee: number;
    net_received: number;
    currency: string;
  };
  delivery: {
    status: string;
    tracking_number: string | null;
    assigned_at: string | null;
    estimate: string | null;
    courier: {
      name: string | null;
      phone: string | null;
      transport: string | null;
    } | null;
  } | null;
  address: {
    recipient: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    phone: string | null;
  } | null;
  dispute: {
    id: number;
    status: string;
    title: string;
    messages_count: number;
  } | null;
};

export type SellerSegment = "new" | "ongoing" | "completed" | "disputes";

export type SellerOrdersEnvelope = {
  data: SellerOrderSummary[];
  meta: { segment: string; current_page: number; last_page: number; total: number };
};

export async function getSellerOnboarding(): Promise<SellerOnboardingProgress> {
  const envelope = await apiFetch<ApiEnvelope<SellerOnboardingProgress>>(
    "/v1/seller/onboarding",
  );
  return envelope.data;
}

export async function sellerStep1(logo: File): Promise<SellerStepResult> {
  const form = new FormData();
  form.append("logo", logo);
  return apiFetch<SellerStepResult>("/v1/seller/onboarding/step1", {
    method: "POST",
    body: form,
  });
}

export async function sellerStep(
  step: number,
  payload: Record<string, unknown>,
): Promise<SellerStepResult> {
  return apiFetch<SellerStepResult>(
    `/v1/seller/onboarding/step/${step}`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function sponsorSeller(sponsorPhone: string): Promise<{
  message: string;
  sponsor: { shop_name: string | null; slug: string | null };
}> {
  return apiFetch(
    "/v1/seller/onboarding/sponsor",
    { method: "POST", body: JSON.stringify({ sponsor_phone: sponsorPhone }) },
  );
}

export async function getSellerOrders(
  segment: SellerSegment = "new",
  page = 1,
): Promise<SellerOrdersEnvelope> {
  return apiFetch<SellerOrdersEnvelope>(
    `/v1/seller/orders?segment=${segment}&page=${page}`,
  );
}

export async function getSellerOrder(
  orderNumber: string,
): Promise<SellerOrderDetail> {
  const envelope = await apiFetch<ApiEnvelope<SellerOrderDetail>>(
    `/v1/seller/orders/${encodeURIComponent(orderNumber)}`,
  );
  return envelope.data;
}

export async function sellerAcceptOrder(orderNumber: string): Promise<void> {
  await apiFetch<unknown>(
    `/v1/seller/orders/${encodeURIComponent(orderNumber)}/accept`,
    { method: "POST" },
  );
}

export async function sellerRefuseOrder(
  orderNumber: string,
  reason?: string,
): Promise<void> {
  await apiFetch<unknown>(
    `/v1/seller/orders/${encodeURIComponent(orderNumber)}/refuse`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}

export async function sellerShipOrder(orderNumber: string): Promise<{
  tracking_number: string;
  courier_assigned: string | false;
}> {
  return apiFetch(
    `/v1/seller/orders/${encodeURIComponent(orderNumber)}/ship`,
    { method: "POST" },
  );
}

export async function sellerMarkDelivered(
  orderNumber: string,
  notes?: string,
): Promise<void> {
  await apiFetch<unknown>(
    `/v1/seller/orders/${encodeURIComponent(orderNumber)}/delivered`,
    { method: "POST", body: JSON.stringify({ delivery_notes: notes }) },
  );
}

export type SellerFinances = {
  balance: { available: number; pending: number; currency: string };
  commission: {
    rate_bps: number;
    rate_pct: number;
    monthly_volume: number;
    tiers: { min: number; rate_pct: number }[];
  };
  next_payout: { amount_minor: number; scheduled_for: string | null };
  last_payouts: {
    id: number;
    amount: number;
    method: string;
    status: string;
    requested_at: string | null;
  }[];
  payout_method: string | null;
  transactions: {
    id: number;
    type: string;
    direction: string;
    amount: number;
    commission: number;
    fee: number;
    net: number;
    order_number: string | null;
    description: string | null;
    created_at: string | null;
  }[];
};

export async function getSellerFinances(): Promise<SellerFinances> {
  const envelope = await apiFetch<ApiEnvelope<SellerFinances>>("/v1/seller/finances");
  return envelope.data;
}

export async function requestSellerPayout(
  amountMinor: number,
  method?: string,
): Promise<{ message: string; data: { payout: unknown; balance: unknown } }> {
  return apiFetch(`/v1/seller/payouts`, {
    method: "POST",
    body: JSON.stringify({ amount_minor: amountMinor, method }),
  });
}

export type SellerAnalytics = {
  revenue: { amount_minor: number; previous_minor: number; variation_pct: number };
  sales_per_day: { date: string; amount_minor: number; orders: number }[];
  top_products: { name: string; quantity: number; revenue: number }[];
  repeat_customers: { rate_pct: number; customers: number };
  trust: { score: number; trend: string; explanations: string[] };
};

export async function getSellerAnalytics(
  period = "30d",
): Promise<SellerAnalytics> {
  const envelope = await apiFetch<ApiEnvelope<SellerAnalytics>>(
    `/v1/seller/analytics?period=${period}`,
  );
  return envelope.data;
}

// ── Boutique publique / produits du vendeur / partage --------------------

export type ShopProduct = {
  id: number;
  slug: string;
  name: string;
  short_description: string | null;
  price: number;
  currency: string;
  stock_quantity: number;
  in_stock: boolean;
  rating_average: number;
  rating_count: number;
  requires_shipping: boolean;
  thumbnail: string | null;
  images: ProductImage[];
};

export type PublicShop = {
  id: number;
  slug: string;
  shop_name: string;
  description: string | null;
  logo: string | null;
  category: CategorySummary | null;
  location: string | null;
  verified: boolean;
  verification_level: number;
  trust_score: number;
  rating_average: number;
  rating_count: number;
  sales_count: number;
  member_since: string | null;
  share_link: string;
};

export type ShopData = {
  shop: PublicShop;
  products: ShopProduct[];
  meta: { total_products: number };
};

export type MyShop = {
  shop: {
    id: number;
    slug: string;
    shop_name: string;
    logo: string | null;
    is_onboarded: boolean;
    share_link: string;
    trust_score: number;
    payout_method: string | null;
  };
  stats: {
    visits_today: number;
    visits_total: number;
    shares_total: number;
    shares_by_channel: Record<string, number>;
    sponsored_shops: number;
  };
};

export type SellerProduct = {
  id: number;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  price: number;
  currency: string;
  stock_quantity: number;
  in_stock: boolean;
  is_active: boolean;
  requires_shipping: boolean;
  shipping_rate: number;
  length_days: number;
  thumbnail: string | null;
  images: ProductImage[];
  category: CategorySummary | null;
  created_at: string | null;
};

export async function getShop(slug: string): Promise<ShopData> {
  const envelope = await apiFetch<ApiEnvelope<ShopData>>(
    `/v1/sellers/${encodeURIComponent(slug)}`,
  );
  return envelope.data;
}

export async function getMyShop(): Promise<MyShop> {
  const envelope = await apiFetch<ApiEnvelope<MyShop>>("/v1/seller/shop");
  return envelope.data;
}

export async function trackShopShare(
  channel: string,
): Promise<{ channel: string; total: number }> {
  return apiFetch("/v1/seller/shop/share", {
    method: "POST",
    body: JSON.stringify({ channel }),
  });
}

export async function getSellerProducts(): Promise<SellerProduct[]> {
  const envelope = await apiFetch<ApiEnvelope<SellerProduct[]>>(
    "/v1/seller/products?per_page=100",
  );
  return envelope.data;
}

export async function createSellerProduct(
  form: FormData,
): Promise<{ message: string; data: SellerProduct }> {
  return apiFetch("/v1/seller/products", { method: "POST", body: form });
}

export async function updateSellerProduct(
  slug: string,
  payload: Record<string, unknown>,
): Promise<{ message: string; data: SellerProduct }> {
  return apiFetch(`/v1/seller/products/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSellerProduct(
  slug: string,
): Promise<{ message: string }> {
  return apiFetch(`/v1/seller/products/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

export const SHARE_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "messenger", label: "Messenger" },
  { id: "telegram", label: "Telegram" },
  { id: "x", label: "X" },
  { id: "sms", label: "SMS" },
] as const;

// ── Livreur : onboarding / disponibilité / courses ------------------------

export type CourierProgress = {
  steps: number;
  current_step: number;
  is_onboarded: boolean;
  status: string;
  transport_type: string | null;
  zone: { lat: string | null; lng: string | null; radius_km: number | null; address: string | null };
  payout: { method: string | null; account: string | null };
  available: boolean;
  approved: boolean;
  review_hours: number;
};

export type CourierJob = {
  delivery_id: number;
  status: string;
  order_number: string;
  tracking_number: string | null;
  assigned_at: string | null;
  picked_at: string | null;
  estimated_delivery: string | null;
  seller: string | null;
  seller_phone: string | null;
  buyer: string | null;
  buyer_phone: string | null;
  items: { name: string; quantity: number }[];
  address: {
    address_line1: string;
    address_line2: string | null;
    city: string;
    phone: string | null;
  } | null;
  notes: string | null;
};

export async function getCourierOnboarding(): Promise<CourierProgress> {
  const envelope = await apiFetch<ApiEnvelope<CourierProgress>>(
    "/v1/delivery/onboarding",
  );
  return envelope.data;
}

export async function courierStep1(form: {
  identity_photo: File;
  selfie: File;
}): Promise<SellerStepResult> {
  const body = new FormData();
  body.append("identity_photo", form.identity_photo);
  body.append("selfie", form.selfie);
  return apiFetch<SellerStepResult>("/v1/delivery/onboarding/step1", {
    method: "POST",
    body,
  });
}

export async function courierStep(
  step: number,
  payload: Record<string, unknown>,
): Promise<SellerStepResult> {
  return apiFetch<SellerStepResult>(`/v1/delivery/onboarding/step/${step}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function setCourierAvailability(
  available: boolean,
): Promise<{ message: string; data: { available: boolean } }> {
  return apiFetch(`/v1/delivery/availability`, {
    method: "PATCH",
    body: JSON.stringify({ available }),
  });
}

export async function getCourierJobs(): Promise<CourierJob[]> {
  const envelope = await apiFetch<ApiEnvelope<CourierJob[]>>("/v1/delivery/jobs");
  return envelope.data;
}

export async function courierPickup(deliveryId: number): Promise<CourierJob> {
  const response = await apiFetch<{ message: string; data: CourierJob }>(
    `/v1/delivery/jobs/${deliveryId}/pickup`,
    { method: "POST" },
  );
  return response.data;
}

export async function courierDeliver(
  deliveryId: number,
  input: { proof?: File; received?: boolean; notes?: string },
): Promise<{ message: string; data: { order_number: string; status: string } }> {
  const body = new FormData();
  if (input.proof) body.append("proof", input.proof);
  if (input.received) body.append("received", "1");
  if (input.notes) body.append("notes", input.notes);
  return apiFetch(`/v1/delivery/jobs/${deliveryId}/deliver`, {
    method: "POST",
    body,
  });
}

// ── Paramètres & sécurité --------------------------------------------------

export type SettingsGroups = {
  account: { name: string; phone: string | null; locale: string | null };
  accessibility: {
    voice_mode: boolean;
    large_text: boolean;
    helper_mode: boolean;
  };
  notifications: {
    notify_voice: boolean;
    notify_sms: boolean;
    notify_inapp: boolean;
  };
  payment_methods: {
    payout_method: string | null;
    payout_account: string | null;
    linked: boolean;
  };
  security: { pin_configured: boolean; biometric_enabled: boolean };
};

export async function getSettings(): Promise<SettingsGroups> {
  const envelope = await apiFetch<ApiEnvelope<SettingsGroups>>("/v1/settings");
  return envelope.data;
}

export async function updateSettings(
  input: Record<string, unknown>,
): Promise<{ message: string }> {
  return apiFetch("/v1/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function contactHelp(message: string): Promise<{
  message: string;
  ticket: string;
}> {
  return apiFetch("/v1/settings/help/contact", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function updatePin(pin: string): Promise<{ message: string }> {
  return apiFetch("/v1/settings/security/pin", {
    method: "PATCH",
    body: JSON.stringify({ pin, pin_confirmation: pin }),
  });
}

export async function verifyPin(pin: string): Promise<{ verified: boolean }> {
  return apiFetch("/v1/settings/security/pin/verify", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export async function securityOverview(): Promise<{
  biometric_enabled: boolean;
  biometric_devices: { id: number; platform: string; created_at: string | null }[];
  pin_configured: boolean;
}> {
  return apiFetch("/v1/settings/security");
}

export async function biometricChallenge(
  credentialId?: string,
): Promise<{ challenge: string; rp: string; timeout: number }> {
  return apiFetch("/v1/settings/security/biometric/challenge", {
    method: "POST",
    body: JSON.stringify({ credential_id: credentialId }),
  });
}

export async function biometricRegister(input: {
  credential_id: string;
  public_key: string;
  platform?: string;
  client_data_json: string;
}): Promise<User> {
  const envelope = await apiFetch<ApiEnvelope<User>>(
    "/v1/settings/security/biometric/register",
    { method: "POST", body: JSON.stringify(input) },
  );
  return envelope.data;
}

export async function biometricUnlock(input: {
  credential_id: string;
  client_data_json: string;
  authenticator_data: string;
  signature: string;
}): Promise<User> {
  const envelope = await apiFetch<ApiEnvelope<User>>(
    "/v1/settings/security/biometric/unlock",
    { method: "POST", body: JSON.stringify(input) },
  );
  return envelope.data;
}