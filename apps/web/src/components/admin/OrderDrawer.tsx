'use client';

/**
 * Side drawer for a single order. Carries the full customer block (the
 * table only shows phone + governorate), every status transition the
 * admin is allowed to take, a delete action behind a confirm, and the
 * invoice trigger. ESC and backdrop-click close it.
 */
import { useEffect, useState } from 'react';
import type { Order, OrderStatus } from '@pocketdeck/types';
import { STATUS_COLORS, STATUSES, formatEGP } from './format';

interface Props {
  order: Order | null;
  onClose: () => void;
  onTransition: (id: string, status: OrderStatus) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onInvoice: (order: Order) => void;
}

export function OrderDrawer({
  order,
  onClose,
  onTransition,
  onDelete,
  onInvoice,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!order) {
      setConfirming(false);
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [order, onClose]);

  if (!order) return null;

  const created = order.createdAt ? new Date(order.createdAt) : null;
  const isTerminal =
    order.status === 'delivered' || order.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-[60] flex">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="flex-1 bg-ink-950/70 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-label={`Order ${order.id.slice(-8).toUpperCase()}`}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-bone-50/10 bg-ink-950 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-bone-50/10 bg-ink-950/95 px-6 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.28em] text-bone-50/40 uppercase">
              Order
            </p>
            <p className="mt-0.5 font-mono text-sm tracking-wider text-bone-50">
              #{order.id.slice(-8).toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-bone-50/15 px-3 py-1.5 font-mono text-[10px] tracking-[0.22em] text-bone-200 uppercase transition-colors hover:border-ember-500/40 hover:text-ember-500"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="flex items-baseline justify-between gap-3">
            <span
              className={`inline-block rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.18em] uppercase ${STATUS_COLORS[order.status]}`}
            >
              {order.status}
            </span>
            <p className="font-mono text-[10px] tracking-[0.18em] text-bone-50/40 uppercase">
              {created ? created.toLocaleString() : '—'}
            </p>
          </div>

          <Section label="Customer">
            <p className="text-base font-medium text-bone-50">
              {order.customer.name}
            </p>
            <a
              href={`tel:${order.customer.phone}`}
              className="mt-1 block font-mono text-sm tracking-wider text-ember-500 hover:underline"
            >
              {order.customer.phone}
            </a>
          </Section>

          <Section label="Shipping address">
            <p className="text-sm leading-relaxed whitespace-pre-line text-bone-50/90">
              {order.customer.address}
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-bone-50/50 uppercase">
              {order.customer.governorate}
            </p>
          </Section>

          <Section
            label={`Build · ${order.packageSize}-board package`}
          >
            <div className="flex flex-col gap-4">
              {order.selections.map((sel, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-bone-50/10 bg-white/[0.02] p-3"
                >
                  <p className="font-mono text-[10px] tracking-[0.24em] text-ember-400 uppercase">
                    Board {i + 1} of {order.packageSize}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <Spec k="Deck" v={sel.deck} />
                    <Spec k="Wheels" v={sel.wheel} />
                    <Spec k="Trucks" v={sel.truck} />
                    <Spec k="Grip" v={sel.grip} />
                  </dl>
                  <p className="mt-3 font-mono text-[10px] tracking-[0.22em] text-bone-50/40 uppercase">
                    SKU · {order.skus[i] ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section label="Total">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-2xl font-bold text-bone-50">
                {formatEGP(order.totalEGP)}
              </p>
              <p className="font-mono text-[11px] tracking-[0.2em] text-bone-50/50 uppercase">
                {order.packageSize} board{order.packageSize > 1 ? 's' : ''}
              </p>
            </div>
          </Section>

          <Section label="Move status">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const active = s === order.status;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={active}
                    onClick={() => onTransition(order.id, s)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${
                      active
                        ? 'border-ember-500/40 bg-ember-500/10 text-ember-300 cursor-default'
                        : 'border-bone-50/15 text-bone-200 hover:border-ember-500/40 hover:text-ember-500'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {isTerminal && (
              <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-bone-50/40 uppercase">
                Final state — pick another to revert.
              </p>
            )}
          </Section>
        </div>

        <div className="sticky bottom-0 mt-auto border-t border-bone-50/10 bg-ink-950/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onInvoice(order)}
              className="flex-1 rounded-full bg-ember-500 px-4 py-2.5 font-mono text-[11px] tracking-[0.26em] text-ink-950 uppercase transition-opacity hover:opacity-90"
            >
              Invoice · PDF
            </button>
            {confirming ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await onDelete(order.id);
                    setConfirming(false);
                  }}
                  className="shrink-0 rounded-full border border-rose-500/50 bg-rose-500/15 px-4 py-2.5 font-mono text-[11px] tracking-[0.22em] whitespace-nowrap text-rose-200 uppercase transition-colors hover:bg-rose-500/25"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="shrink-0 rounded-full border border-bone-50/15 px-4 py-2.5 font-mono text-[11px] tracking-[0.22em] whitespace-nowrap text-bone-200 uppercase transition-colors hover:bg-white/5"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="shrink-0 rounded-full border border-rose-500/30 px-4 py-2.5 font-mono text-[11px] tracking-[0.26em] whitespace-nowrap text-rose-300 uppercase transition-colors hover:bg-rose-500/10"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="font-mono text-[10px] tracking-[0.28em] text-bone-50/40 uppercase">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-bone-50/10 bg-white/[0.02] px-3 py-2">
      <dt className="font-mono text-[10px] tracking-[0.22em] text-bone-50/40 uppercase">
        {k}
      </dt>
      <dd className="mt-0.5 font-mono text-[12px] tracking-wider text-bone-50 uppercase">
        {v}
      </dd>
    </div>
  );
}
