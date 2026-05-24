/**
 * Admin auth helpers (client-side).
 *
 * The shared password is exchanged for a short-lived token via
 * POST /api/admin/login. We stash the token in localStorage so the
 * dashboard survives a refresh, and pass it as a Bearer header on
 * every admin call. Token lifetime is enforced server-side; the client
 * just clears it on 401-ish failures.
 */
import { apiClient, ApiError } from './api';

const STORAGE_KEY = 'pocketdeck:adminToken';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore - private mode etc.
  }
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Exchange the shared password for a token. Throws ApiError on bad
 * password / rate limit.
 */
export async function adminLogin(password: string): Promise<string> {
  try {
    const { data } = await apiClient.post<{ data: { token: string } }>(
      '/admin/login',
      { password },
    );
    setAdminToken(data.data.token);
    return data.data.token;
  } catch (err) {
    // The server returns 404 for bad password (don't leak existence)
    // but we want the UI to show a friendly "wrong password" message.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      throw new ApiError('Wrong password.', 'NOT_FOUND', 401);
    }
    throw err;
  }
}

export function adminAuthHeader(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Shape of the /admin/stats response. */
export interface AdminStats {
  totalOrders: number;
  deliveredCount: number;
  deliveredRevenueEGP: number;
  averageOrderEGP: number;
  byStatus: {
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  topConfigurations: {
    selection: { deck: string; wheel: string; truck: string; grip: string };
    count: number;
    revenueEGP: number;
  }[];
  dailySales: { date: string; orders: number; revenueEGP: number }[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<{ data: AdminStats }>('/admin/stats', {
    headers: adminAuthHeader(),
  });
  return data.data;
}

/** Shape of the /admin/analytics response. */
export interface AdminAnalytics {
  totals: {
    pageViews: number;
    uniqueVisitors: number;
    totalOrders: number;
    deliveredCount: number;
    deliveredRevenueEGP: number;
    conversionRate: number;
  };
  daily: {
    date: string;
    views: number;
    uniqueVisitors: number;
    orders: number;
    revenueEGP: number;
  }[];
  topConfigurations: {
    selection: { deck: string; wheel: string; truck: string; grip: string };
    count: number;
    revenueEGP: number;
  }[];
}

export async function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  const { data } = await apiClient.get<{ data: AdminAnalytics }>(
    '/admin/analytics',
    { headers: adminAuthHeader() },
  );
  return data.data;
}
