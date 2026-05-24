'use client';

/**
 * /track-order
 *
 * Customer-facing order lookup. The form takes an order ID + phone
 * number; the server only returns the order if both match (avoids
 * leaking order data by ID enumeration).
 *
 * Renders the order's current status as a four-step timeline so
 * customers can see at a glance where their build is in the pipeline.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Order, OrderStatus } from '@pocketdeck/types';
import { trackOrder, ApiError } from '@/lib/api';

interface RecentOrderRef {
  id: string;
  phone: string;
  createdAt: string;
}

function loadRecentOrders(): RecentOrderRef[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('pocketdeck:recentOrders');
    return raw ? (JSON.parse(raw) as RecentOrderRef[]) : [];
  } catch {
    return [];
  }
}

const STATUS_FLOW: { status: OrderStatus; label: string; help: string }[] = [
  { status: 'pending', label: 'Pending', help: 'Order received, awaiting confirmation.' },
  { status: 'confirmed', label: 'Confirmed', help: 'We rang you and it is queued.' },
  { status: 'shipped', label: 'Shipped', help: 'On its way to you.' },
  { status: 'delivered', label: 'Delivered', help: 'In your pocket.' },
];

function statusIndex(s: OrderStatus): number {
  if (s === 'cancelled') return -1;
  return STATUS_FLOW.findIndex((step) => step.status === s);
}

export default function TrackOrderPage() {
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentOrderRef[]>([]);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    setRecent(loadRecentOrders());
  }, []);

  // Deep link: /track-order?id=…&phone=… autofills + fires the lookup
  // so the success page's "Track this order" CTA lands on the timeline
  // directly. We read window.location.search instead of
  // useSearchParams() to avoid the Suspense-boundary requirement Next
  // adds for that hook; we're already a client component.
  useEffect(() => {
    if (autoSubmitted.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qid = params.get('id')?.trim() ?? '';
    const qphone = params.get('phone')?.trim() ?? '';
    if (!qid && !qphone) return;
    if (qid) setId(qid);
    if (qphone) setPhone(qphone);
    if (qid && qphone) {
      autoSubmitted.current = true;
      void lookup(qid, qphone);
    }
  }, []);

  async function lookup(orderId: string, orderPhone: string) {
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const result = await trackOrder(orderId, orderPhone);
      setOrder(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'We could not find that order.');
      } else {
        setError('Something went wrong looking that up.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void lookup(id.trim(), phone.trim());
  }

  return (
    <main className="relative z-10 min-h-screen bg-ink-950 px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.28em] text-bone-50/60 uppercase hover:text-ember-500"
        >
          ← back to PocketDeck
        </Link>

        <h1 className="display-headline mt-8 text-5xl md:text-6xl">
          Track your{' '}
          <span className="text-ember-500">order.</span>
        </h1>
        <p className="caption mt-4 max-w-md text-bone-50/70">
          Enter the order ID we sent you when we confirmed by phone, plus the
          number we called you on.
        </p>

        {recent.length > 0 && (
          <div className="mt-8 rounded-2xl border border-bone-50/10 bg-white/[0.03] p-4">
            <p className="font-mono text-[10px] tracking-[0.24em] text-bone-50/50 uppercase">
              Recent on this device
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {recent.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => {
                      setId(r.id);
                      setPhone(r.phone);
                      void lookup(r.id, r.phone);
                    }}
                    className="rounded-full border border-bone-50/15 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-bone-200 uppercase transition-colors hover:border-ember-500/40 hover:text-ember-500"
                  >
                    {new Date(r.createdAt).toLocaleDateString()} · …{r.id.slice(-6)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-10 space-y-6">
          <div>
            <label
              htmlFor="orderId"
              className="block font-mono text-[11px] tracking-[0.28em] text-bone-200 uppercase"
            >
              Order ID
            </label>
            <input
              id="orderId"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="64fa…"
              className="mt-2 w-full rounded-xl border border-bone-50/10 bg-white/5 px-4 py-3 font-mono text-sm tracking-wide text-bone-50 placeholder:text-bone-50/30 focus:border-ember-500 focus:outline-none"
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="phoneTrack"
              className="block font-mono text-[11px] tracking-[0.28em] text-bone-200 uppercase"
            >
              Phone
            </label>
            <input
              id="phoneTrack"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="mt-2 w-full rounded-xl border border-bone-50/10 bg-white/5 px-4 py-3 font-mono text-sm tracking-wide text-bone-50 placeholder:text-bone-50/30 focus:border-ember-500 focus:outline-none"
              required
              autoComplete="tel"
            />
            <p className="mt-2 font-mono text-[10px] tracking-[0.2em] text-bone-50/40 uppercase">
              Egyptian mobile, 11 digits starting with 01.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-ember-500/30 bg-ember-500/10 px-4 py-3 text-sm text-ember-500"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-ember-500 px-8 py-3 font-mono text-[12px] tracking-[0.28em] text-ink-950 uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Looking…' : 'Track'}
          </button>
        </form>

        {order && <OrderTimeline order={order} />}
      </div>
    </main>
  );
}

function OrderTimeline({ order }: { order: Order }) {
  const idx = statusIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <section className="mt-14 rounded-2xl border border-bone-50/10 bg-white/[0.04] p-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-bone-50/50 uppercase">
            Order
          </p>
          <p className="mt-1 font-mono text-xs text-bone-200">{order.id}</p>
        </div>
        <p className="text-2xl font-bold text-bone-50">
          {order.totalEGP} EGP
        </p>
      </header>

      <p className="mt-6 font-mono text-[10px] tracking-[0.24em] text-ember-400 uppercase">
        {order.packageSize}-board package
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {order.selections.map((sel, i) => (
          <div
            key={i}
            className="rounded-xl border border-bone-50/10 bg-white/[0.02] p-4"
          >
            <p className="font-mono text-[10px] tracking-[0.22em] text-bone-50/60 uppercase">
              Board {i + 1}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.18em] uppercase">
              <dt className="text-bone-50/50">Deck</dt>
              <dd className="text-right text-bone-50">{sel.deck}</dd>
              <dt className="text-bone-50/50">Wheels</dt>
              <dd className="text-right text-bone-50">{sel.wheel}</dd>
              <dt className="text-bone-50/50">Trucks</dt>
              <dd className="text-right text-bone-50">{sel.truck}</dd>
              <dt className="text-bone-50/50">Grip</dt>
              <dd className="text-right text-bone-50">{sel.grip}</dd>
            </dl>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] tracking-[0.18em] text-bone-50/50 uppercase">
        Ship to ·{' '}
        <span className="text-bone-50">{order.customer.governorate}</span>
      </p>

      {isCancelled ? (
        <p className="mt-8 rounded-xl border border-ember-500/30 bg-ember-500/10 px-4 py-3 text-sm text-ember-500">
          This order was cancelled. If you didn't request this, get in touch.
        </p>
      ) : (
        <ol className="mt-8 space-y-3">
          {STATUS_FLOW.map((step, i) => {
            const reached = i <= idx;
            const current = i === idx;
            return (
              <li
                key={step.status}
                className={`flex items-start gap-4 rounded-xl border px-4 py-3 transition-colors ${
                  reached
                    ? 'border-ember-500/50 bg-ember-500/[0.06]'
                    : 'border-bone-50/10 bg-white/[0.02]'
                }`}
              >
                <span
                  className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                    reached ? 'bg-ember-500 text-ink-950' : 'bg-bone-50/10 text-bone-50/40'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-bold uppercase tracking-wider ${
                      reached ? 'text-bone-50' : 'text-bone-50/40'
                    }`}
                  >
                    {step.label}
                    {current && (
                      <span className="ml-2 font-mono text-[10px] tracking-[0.2em] text-ember-500">
                        current
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-bone-50/60">{step.help}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-8 text-xs text-bone-50/40">
        Cairo, Giza, and Alexandria ship next day. Everywhere else, 2 to 4 days.
      </p>
    </section>
  );
}
