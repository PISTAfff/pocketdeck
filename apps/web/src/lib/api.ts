/**
 * Typed Axios client for the PocketDeck API.
 *
 * All requests go through `/api/...` which Next.js dev-proxies to the Express
 * backend (see `next.config.ts`). 422 responses are surfaced as `ApiValidationError`
 * so callers can map `errors[].field` (dot path) to inputs.
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

const client: AxiosInstance = axios.create({
  baseURL: '/api',
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

/** Anything else the server told us — used for 4xx/5xx that aren't 422. */
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

export { client as apiClient };
