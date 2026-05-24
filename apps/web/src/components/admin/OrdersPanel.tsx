'use client';

/**
 * Orders tab body.
 *
 * Compact table of recent orders with filter pills, a search box, and
 * row-click opening the detail drawer. Mobile gets a stacked card list
 * since a 6-column table doesn't reflow nicely below ~640px.
 */
import { useMemo, useState } from 'react';
import type { Order, OrderStatus } from '@pocketdeck/types';
import { OrderDrawer } from './OrderDrawer';
import { InvoiceModal } from './InvoiceModal';
import {
  STATUS_COLORS,
  STATUSES,
  formatEGP,
  shortDate,
  shortTime,
} from './format';

interface Props {
  orders: Order[];
  byStatus: Record<OrderStatus, number>;
  totalCount: number;
  busy: boolean;
  filter: OrderStatus | 'all';
  onFilterChange: (f: OrderStatus | 'all') => void;
  onTransition: (id: string, status: OrderStatus) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function OrdersPanel({
  orders,
  byStatus,
  totalCount,
  busy,
  filter,
  onFilterChange,
  onTransition,
  onDelete,
}: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Old orders written before the multi-board migration carry the
  // legacy singular `selection` / `sku` fields instead of the new
  // arrays. These helpers normalize both shapes so the panel doesn't
  // crash when reading mixed data.
  const selectionsOf = (
    o: Order,
  ): { deck: string; wheel: string; truck: string; grip: string }[] => {
    if (Array.isArray(o.selections) && o.selections.length > 0) {
      return o.selections;
    }
    const legacy = (o as unknown as { selection?: {
      deck: string;
      wheel: string;
      truck: string;
      grip: string;
    } }).selection;
    return legacy ? [legacy] : [];
  };

  const skusOf = (o: Order): string[] => {
    if (Array.isArray(o.skus) && o.skus.length > 0) return o.skus;
    const legacy = (o as unknown as { sku?: string }).sku;
    return legacy ? [legacy] : [];
  };

  const packageSizeOf = (o: Order): number =>
    typeof o.packageSize === 'number' && o.packageSize > 0
      ? o.packageSize
      : selectionsOf(o).length || 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const selectionsText = selectionsOf(o)
        .map((s) => `${s.deck} ${s.wheel} ${s.truck} ${s.grip}`)
        .join(' ');
      const hay = `${o.id} ${o.customer.name} ${o.customer.phone} ${o.customer.governorate} ${skusOf(o).join(' ')} ${selectionsText}`;
      return hay.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, query]);

  // First-board summary for the dense table row. Multi-board orders also
  // surface a "+N more" pill below so admins know there's more inside.
  const buildSummary = (o: Order): string => {
    const s = selectionsOf(o)[0];
    if (!s) return '—';
    return `${s.deck} · ${s.wheel} · ${s.truck} · ${s.grip}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <FilterPill
          label="All"
          value={totalCount}
          active={filter === 'all'}
          onClick={() => onFilterChange('all')}
        />
        {STATUSES.map((s) => (
          <FilterPill
            key={s}
            label={s}
            value={byStatus[s] ?? 0}
            active={filter === s}
            onClick={() => onFilterChange(filter === s ? 'all' : s)}
          />
        ))}
        <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
          <SearchInput value={query} onChange={setQuery} />
        </div>
      </div>

      {/* Desktop table */}
      <div className="mt-5 hidden overflow-hidden rounded-2xl border border-bone-50/10 bg-white/[0.02] md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-bone-50/10 bg-white/[0.02] font-mono text-[10px] tracking-[0.2em] text-bone-50/50 uppercase">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Build</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !busy && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-bone-50/40">
                  {query ? 'No matches.' : 'No orders yet.'}
                </td>
              </tr>
            )}
            {filtered.map((o) => {
              const created = o.createdAt ? new Date(o.createdAt) : null;
              return (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="cursor-pointer border-b border-bone-50/[0.06] last:border-b-0 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 align-top">
                    <p className="text-bone-50">
                      {created ? shortDate(created) : '—'}
                    </p>
                    <p className="font-mono text-[10px] text-bone-50/40">
                      {created ? shortTime(created) : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="truncate text-bone-50">{o.customer.name}</p>
                    <p className="font-mono text-[10px] text-bone-50/50">
                      {o.customer.phone} · {o.customer.governorate}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-[10px] tracking-wider text-bone-200 uppercase">
                    {buildSummary(o)}
                    {packageSizeOf(o) > 1 && (
                      <span className="mt-1 inline-block rounded-full bg-ember-500/15 px-2 py-0.5 text-[9px] tracking-[0.2em] text-ember-300">
                        +{packageSizeOf(o) - 1} more board
                        {packageSizeOf(o) - 1 > 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right font-bold text-bone-50">
                    {formatEGP(o.totalEGP)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase ${STATUS_COLORS[o.status]}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 align-top text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1.5">
                      <IconButton
                        title="Invoice (PDF)"
                        onClick={() => setInvoiceOrder(o)}
                      >
                        <PrintIcon />
                      </IconButton>
                      <IconButton
                        title="Open details"
                        onClick={() => setSelected(o)}
                      >
                        <DetailsIcon />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="mt-5 space-y-3 md:hidden">
        {filtered.length === 0 && !busy && (
          <li className="rounded-2xl border border-bone-50/10 bg-white/[0.02] px-4 py-10 text-center text-bone-50/40">
            {query ? 'No matches.' : 'No orders yet.'}
          </li>
        )}
        {filtered.map((o) => {
          const created = o.createdAt ? new Date(o.createdAt) : null;
          return (
            <li
              key={o.id}
              className="rounded-2xl border border-bone-50/10 bg-white/[0.03] p-4"
            >
              <button
                type="button"
                onClick={() => setSelected(o)}
                className="block w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-bone-50">{o.customer.name}</p>
                    <p className="font-mono text-[11px] text-bone-50/50">
                      {o.customer.phone} · {o.customer.governorate}
                    </p>
                    {created && (
                      <p className="mt-1 font-mono text-[10px] text-bone-50/40">
                        {shortDate(created)} · {shortTime(created)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase ${STATUS_COLORS[o.status]}`}
                  >
                    {o.status}
                  </span>
                </div>
                <p className="mt-3 font-mono text-[10px] tracking-wider text-bone-200 uppercase">
                  {buildSummary(o)}
                  {packageSizeOf(o) > 1 && (
                    <span className="ml-2 inline-block rounded-full bg-ember-500/15 px-2 py-0.5 text-[9px] tracking-[0.2em] text-ember-300">
                      +{packageSizeOf(o) - 1} more
                    </span>
                  )}
                </p>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <p className="text-lg font-bold text-bone-50">
                    {formatEGP(o.totalEGP)}
                  </p>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-ember-500 uppercase">
                    Details →
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <OrderDrawer
        order={selected}
        onClose={() => setSelected(null)}
        onTransition={async (id, s) => {
          await onTransition(id, s);
          // Reflect the new status in the open drawer without
          // re-opening it.
          setSelected((prev) => (prev && prev.id === id ? { ...prev, status: s } : prev));
        }}
        onDelete={async (id) => {
          await onDelete(id);
          setSelected(null);
        }}
        onInvoice={(o) => setInvoiceOrder(o)}
      />

      <InvoiceModal
        order={invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />
    </>
  );
}

function FilterPill({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
        active
          ? 'border-ember-500/60 bg-ember-500/10'
          : 'border-bone-50/10 bg-white/[0.02] hover:bg-white/[0.05]'
      }`}
    >
      <span
        className={`font-mono text-[10px] tracking-[0.22em] uppercase ${
          active ? 'text-ember-300' : 'text-bone-200'
        }`}
      >
        {label}
      </span>
      <span
        className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
          active
            ? 'bg-ember-500/20 text-ember-200'
            : 'bg-white/[0.05] text-bone-50/70'
        }`}
      >
        {value}
      </span>
    </button>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex w-full items-center gap-2 rounded-full border border-bone-50/10 bg-white/[0.02] px-3 py-1.5 focus-within:border-ember-500/40 sm:w-72">
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0 fill-none stroke-bone-50/50"
        strokeWidth={1.6}
        aria-hidden
      >
        <circle cx="7" cy="7" r="5" />
        <path d="m11 11 3 3" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name, phone, sku…"
        className="w-full bg-transparent font-mono text-[11px] tracking-wider text-bone-50 placeholder-bone-50/30 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="font-mono text-[10px] text-bone-50/40 hover:text-bone-50"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </label>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-bone-50/10 text-bone-200 transition-colors hover:border-ember-500/40 hover:text-ember-500"
    >
      {children}
    </button>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={1.4} aria-hidden>
      <path d="M4 6V2h8v4" strokeLinejoin="round" />
      <rect x="2" y="6" width="12" height="6" rx="1" />
      <rect x="4" y="9" width="8" height="5" rx="0.5" />
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={1.4} aria-hidden>
      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
