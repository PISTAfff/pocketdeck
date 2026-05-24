'use client';

/**
 * /admin
 *
 * Compact operations dashboard with three tabs:
 *   - Orders: filterable + searchable order list, row-click opens a
 *     details drawer with full address, status transitions, delete,
 *     and an invoice PDF (system print dialog).
 *   - Analytics: traffic, sales, status distribution, top
 *     configurations — all rendered as in-house SVG charts.
 *   - Newsletter: subscriber list with delete, rich-text composer +
 *     send, plus a danger-zone "reset everything" wipe.
 *
 * Tabs share one fetch cycle so switching tabs is free.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Order, OrderStatus, Subscriber } from '@pocketdeck/types';
import {
  ApiError,
  deleteOrder,
  listOrders,
  listSubscribers,
  updateOrderStatus,
} from '@/lib/api';
import {
  adminAuthHeader,
  clearAdminToken,
  fetchAdminAnalytics,
  fetchAdminStats,
  getAdminToken,
  type AdminAnalytics,
  type AdminStats,
} from '@/lib/adminAuth';
import { OrdersPanel } from '@/components/admin/OrdersPanel';
import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel';
import { NewsletterPanel } from '@/components/admin/NewsletterPanel';

type Tab = 'orders' | 'analytics' | 'newsletter';

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      setAuthed(false);
      return;
    }
    setAuthed(true);
  }, [router]);

  const load = useCallback(async () => {
    if (!authed) return;
    setBusy(true);
    setError(null);
    try {
      const auth = adminAuthHeader();
      const [orderList, statSnapshot, analyticsSnapshot, subList] =
        await Promise.all([
          listOrders({
            status: filter === 'all' ? undefined : filter,
            limit: 200,
            authHeader: auth,
          }),
          fetchAdminStats(),
          fetchAdminAnalytics(),
          listSubscribers(auth),
        ]);
      setOrders(orderList);
      setStats(statSnapshot);
      setAnalytics(analyticsSnapshot);
      setSubscribers(subList);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        clearAdminToken();
        router.replace('/admin/login');
        return;
      }
      setError(
        err instanceof ApiError ? err.message : 'Failed to load dashboard.',
      );
    } finally {
      setBusy(false);
    }
  }, [filter, authed, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const onTransition = useCallback(
    async (id: string, status: OrderStatus) => {
      const auth = adminAuthHeader();
      try {
        const updated = await updateOrderStatus(id, status, auth);
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o)),
        );
        // Stats + analytics include status-derived numbers; reload in
        // the background but don't block the UI on it.
        void Promise.all([fetchAdminStats(), fetchAdminAnalytics()])
          .then(([s, a]) => {
            setStats(s);
            setAnalytics(a);
          })
          .catch(() => undefined);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : 'Status update failed.',
        );
      }
    },
    [],
  );

  const onDelete = useCallback(async (id: string) => {
    const auth = adminAuthHeader();
    try {
      await deleteOrder(id, auth);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      void Promise.all([fetchAdminStats(), fetchAdminAnalytics()])
        .then(([s, a]) => {
          setStats(s);
          setAnalytics(a);
        })
        .catch(() => undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed.');
    }
  }, []);

  function logout() {
    clearAdminToken();
    router.replace('/admin/login');
  }

  const totals = useMemo(() => {
    const byStatus = stats?.byStatus ?? {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    const total =
      stats == null
        ? orders.length
        : Object.values(byStatus).reduce((a, b) => a + b, 0);
    return { byStatus, total };
  }, [stats, orders.length]);

  if (authed === null || authed === false) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center bg-ink-950 px-6">
        <p className="font-mono text-[11px] tracking-[0.28em] text-bone-50/40 uppercase">
          Loading…
        </p>
      </main>
    );
  }

  return (
    <main className="relative z-10 min-h-screen bg-ink-950 px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/"
              className="font-mono text-[10px] tracking-[0.28em] text-bone-50/60 uppercase hover:text-ember-500"
            >
              ← PocketDeck
            </Link>
            <h1 className="display-headline mt-2 text-2xl md:text-3xl">
              Orders <span className="text-ember-500">desk.</span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full transition-colors ${
                busy
                  ? 'bg-amber-400/80 animate-pulse'
                  : error
                  ? 'bg-rose-400/80'
                  : 'bg-emerald-400/80'
              }`}
            />
            <button
              onClick={load}
              disabled={busy}
              className="rounded-full border border-bone-50/15 px-3 py-1.5 font-mono text-[10px] tracking-[0.22em] text-bone-200 uppercase transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              {busy ? '…' : 'Refresh'}
            </button>
            <button
              onClick={logout}
              className="rounded-full border border-bone-50/15 px-3 py-1.5 font-mono text-[10px] tracking-[0.22em] text-bone-200 uppercase transition-colors hover:border-ember-500/40 hover:text-ember-500"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Tab strip — compact, segmented, with live counts. */}
        <div
          role="tablist"
          aria-label="Admin sections"
          className="mt-6 inline-flex rounded-full border border-bone-50/10 bg-white/[0.03] p-1"
        >
          <TabButton
            active={tab === 'orders'}
            onClick={() => setTab('orders')}
            label="Orders"
            badge={String(totals.total)}
          />
          <TabButton
            active={tab === 'analytics'}
            onClick={() => setTab('analytics')}
            label="Analytics"
            badge={
              analytics
                ? formatCompact(analytics.totals.pageViews)
                : '—'
            }
          />
          <TabButton
            active={tab === 'newsletter'}
            onClick={() => setTab('newsletter')}
            label="Newsletter"
            badge={String(subscribers.length)}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-ember-500/30 bg-ember-500/10 px-4 py-3 text-sm text-ember-500"
          >
            {error}
          </div>
        )}

        <div className="mt-5">
          {tab === 'orders' && (
            <OrdersPanel
              orders={orders}
              byStatus={totals.byStatus}
              totalCount={totals.total}
              busy={busy}
              filter={filter}
              onFilterChange={setFilter}
              onTransition={onTransition}
              onDelete={onDelete}
            />
          )}
          {tab === 'analytics' && (
            <AnalyticsPanel
              analytics={analytics}
              byStatus={totals.byStatus}
              busy={busy}
            />
          )}
          {tab === 'newsletter' && (
            <NewsletterPanel onResetComplete={load} />
          )}
        </div>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors ${
        active
          ? 'bg-ember-500 text-ink-950'
          : 'text-bone-200 hover:text-bone-50'
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? 'bg-ink-950/20 text-ink-950' : 'bg-white/[0.06] text-bone-50/70'
        }`}
      >
        {badge}
      </span>
    </button>
  );
}

function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}
