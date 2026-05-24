/**
 * Shared formatters for admin surfaces. Keeping these in one place
 * avoids drift between the orders panel, analytics panel, and the
 * printable invoice.
 */
import type { OrderStatus } from '@pocketdeck/types';

export function formatEGP(n: number): string {
  return new Intl.NumberFormat('en-EG').format(Math.round(n)) + ' EGP';
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-EG').format(n);
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  confirmed: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  shipped: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export const STATUS_HEX: Record<OrderStatus, string> = {
  pending: '#f59e0b',
  confirmed: '#22d3ee',
  shipped: '#a78bfa',
  delivered: '#34d399',
  cancelled: '#fb7185',
};

export const STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

/** Compact short-date for the orders table (e.g. "23 May"). */
export function shortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function shortTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
