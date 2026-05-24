/**
 * Typed Axios client for the PocketDeck API.
 *
 * Requests go straight to the API origin from the browser — no Next.js
 * rewrite proxy in front. The origin comes from `NEXT_PUBLIC_API_ORIGIN`,
 * which is baked at build time:
 *   - dev:  http://localhost:4000 (the Express dev server)
 *   - prod: the deployed API host (e.g. https://pocketdeck-api.onrender.com)
 * CORS on the API (see `apps/api/src/app.ts`) explicitly whitelists the
 * web origin(s) via the `WEB_ORIGIN` env var, so cross-origin requests
 * succeed without credentials. 422 responses are surfaced as
 * `ApiValidationError` so callers can map `errors[].field` (dot path) to
 * inputs.
 */
import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  ApiErrorResponse,
  ApiFieldError,
  CreateOrderRequest,
  CreateOrderResponse,
  CreateSubscriberRequest,
  CreateSubscriberResponse,
  GetProductResponse,
  Order,
  Product,
  Subscriber,
} from '@pocketdeck/types';

// Trailing slash on the origin would produce `…//api/...` after the
// concat below, so normalize it away. Empty string means "same origin",
// kept as a fallback only — production builds should always have the env
// var set.
const RAW_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000';
const API_ORIGIN = RAW_ORIGIN.replace(/\/+$/, '');

const client: AxiosInstance = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

/** Structured 422 validation failure with the offending field paths. */
export class ApiValidationError extends Error {
  readonly code = 'VALIDATION_ERROR' as const;
  readonly status = 422 as const;
  readonly errors: ApiFieldError[];

  constructor(message: string, errors: ApiFieldError[]) {
    super(message);
    this.name = 'ApiValidationError';
    this.errors = errors;
  }
}

/** Anything else the server told us, used for 4xx/5xx that aren't 422. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

function unwrap(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<ApiErrorResponse>;
    const status = axErr.response?.status ?? 0;
    const payload = axErr.response?.data?.error;
    const message = payload?.message ?? axErr.message ?? 'Request failed.';
    const code = payload?.code ?? 'UNKNOWN';
    if (status === 422 && payload?.errors?.length) {
      throw new ApiValidationError(message, payload.errors);
    }
    throw new ApiError(message, code, status);
  }
  if (err instanceof Error) throw err;
  throw new Error('Unknown error.');
}

export async function getProduct(slug: string): Promise<Product> {
  try {
    const { data } = await client.get<GetProductResponse>(`/products/${slug}`);
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

export async function createOrder(req: CreateOrderRequest): Promise<Order> {
  try {
    const { data } = await client.post<CreateOrderResponse>('/orders', req);
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

export async function createSubscriber(email: string): Promise<Subscriber> {
  try {
    const body: CreateSubscriberRequest = { email };
    const { data } = await client.post<CreateSubscriberResponse>(
      '/subscribers',
      body,
    );
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

/**
 * Customer order tracking: matches an order ID with the phone number on
 * file. The API returns 404 with the same payload whether the order
 * doesn't exist OR the phone doesn't match, so we don't leak existence.
 */
export async function trackOrder(id: string, phone: string): Promise<Order> {
  try {
    const { data } = await client.get<{ data: Order }>(
      `/orders/track/${encodeURIComponent(id)}`,
      { params: { phone } },
    );
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

/** Admin: list recent orders, optionally filtered by status. */
export async function listOrders(opts: {
  status?: string;
  limit?: number;
  authHeader?: Record<string, string>;
} = {}): Promise<Order[]> {
  try {
    const { data } = await client.get<{ data: Order[] }>('/orders', {
      params: { status: opts.status, limit: opts.limit },
      headers: opts.authHeader,
    });
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

/** Admin: transition an order's status. */
export async function updateOrderStatus(
  id: string,
  status: string,
  authHeader?: Record<string, string>,
): Promise<Order> {
  try {
    const { data } = await client.patch<{ data: Order }>(
      `/orders/${encodeURIComponent(id)}/status`,
      { status },
      { headers: authHeader },
    );
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

/** Admin: hard-delete an order. */
export async function deleteOrder(
  id: string,
  authHeader?: Record<string, string>,
): Promise<void> {
  try {
    await client.delete(`/orders/${encodeURIComponent(id)}`, {
      headers: authHeader,
    });
  } catch (err) {
    unwrap(err);
  }
}

/**
 * Public: fire-and-forget page-view ping. Failures swallowed (we don't
 * want analytics outages to break navigation) so this returns void.
 */
export async function trackPageView(payload: {
  path: string;
  visitorId: string;
  referrer?: string;
}): Promise<void> {
  try {
    await client.post('/admin/track', payload, { timeout: 4000 });
  } catch {
    // intentionally swallowed
  }
}

/** Admin: list all newsletter subscribers. */
export async function listSubscribers(
  authHeader?: Record<string, string>,
): Promise<Subscriber[]> {
  try {
    const { data } = await client.get<{ data: Subscriber[] }>(
      '/admin/subscribers',
      { headers: authHeader },
    );
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

/** Admin: remove a subscriber by id. */
export async function deleteSubscriber(
  id: string,
  authHeader?: Record<string, string>,
): Promise<void> {
  try {
    await client.delete(`/admin/subscribers/${encodeURIComponent(id)}`, {
      headers: authHeader,
    });
  } catch (err) {
    unwrap(err);
  }
}

export interface SentNewsletter {
  id: string;
  subject: string;
  bodyHtml: string;
  recipientCount: number;
  createdAt: string;
  sent?: boolean;
}

/** Admin: send a newsletter (records + counts; sending is a no-op here). */
export async function sendNewsletter(
  payload: { subject: string; bodyHtml: string },
  authHeader?: Record<string, string>,
): Promise<SentNewsletter> {
  try {
    const { data } = await client.post<{ data: SentNewsletter }>(
      '/admin/newsletter',
      payload,
      { headers: authHeader },
    );
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

/** Admin: past newsletter campaigns, newest first. */
export async function listNewsletters(
  authHeader?: Record<string, string>,
): Promise<SentNewsletter[]> {
  try {
    const { data } = await client.get<{ data: SentNewsletter[] }>(
      '/admin/newsletters',
      { headers: authHeader },
    );
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

export interface ResetSummary {
  orders: number;
  subscribers: number;
  pageViews: number;
  newsletters: number;
  productsReset: number;
}

/** Admin: nuke every collection. Body has a confirm token to avoid mis-clicks. */
export async function resetEverything(
  authHeader?: Record<string, string>,
): Promise<ResetSummary> {
  try {
    const { data } = await client.post<{ data: ResetSummary }>(
      '/admin/reset',
      { confirm: 'RESET' },
      { headers: authHeader },
    );
    return data.data;
  } catch (err) {
    unwrap(err);
  }
}

export { client as apiClient };
