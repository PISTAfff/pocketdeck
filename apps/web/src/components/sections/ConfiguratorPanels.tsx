'use client';

/**
 * Companion panels for the configurator section: the live price preview with
 * a per-axis breakdown, plus the loading/error fallback shown while the
 * product fetch is in flight.
 */
import { motion } from 'framer-motion';
import type {
  ConfigurationSelection,
  Product,
  VariantOption,
} from '@pocketdeck/types';

const formatEGP = (egp: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(egp);

export interface VariantStockInfo {
  inStock: boolean;
  stock: number;
}

export interface PriceBreakdownRow {
  axis: string;
  variant: string;
  amount: number;
}

interface PricePanelProps {
  product: Product | null;
  price: number | null;
  sku: string;
  stockInfo: VariantStockInfo | null;
  breakdown: PriceBreakdownRow[];
  loading: boolean;
  error: string | null;
}

export function PricePanel({
  product,
  price,
  sku,
  stockInfo,
  breakdown,
  loading,
  error,
}: PricePanelProps) {
  return (
    <motion.div
      layout
      className="self-start rounded-2xl border border-bone-50/10 bg-ink-900/85 p-7 backdrop-blur-xl"
    >
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
          Live preview
        </p>
        {stockInfo && stockInfo.inStock && (
          <span className="rounded-full bg-bone-50/5 px-3 py-1 font-mono text-[10px] tracking-[0.28em] text-bone-200 uppercase">
            In stock · {stockInfo.stock}
          </span>
        )}
        {stockInfo && !stockInfo.inStock && (
          <span className="rounded-full bg-ember-500/10 px-3 py-1 font-mono text-[10px] tracking-[0.28em] text-ember-400 uppercase">
            Out of stock
          </span>
        )}
      </div>

      <p className="mt-4 font-display text-5xl font-semibold tracking-[-0.02em] text-bone-50 md:text-6xl">
        {price !== null ? formatEGP(price) : loading ? '...' : '—'}
      </p>

      {product && (
        <dl className="mt-6 space-y-2 border-t border-bone-50/10 pt-5 font-mono text-[12px] text-bone-300">
          <div className="flex items-center justify-between">
            <dt>Base</dt>
            <dd className="text-bone-100">{formatEGP(product.basePriceEGP)}</dd>
          </div>
          {breakdown.map((row) => (
            <div key={row.axis} className="flex items-center justify-between">
              <dt className="text-bone-300">
                {row.axis}
                <span className="ml-2 text-bone-500/70">{row.variant}</span>
              </dt>
              <dd
                className={row.amount > 0 ? 'text-ember-400' : 'text-bone-500/70'}
              >
                {row.amount > 0 ? `+${formatEGP(row.amount)}` : 'included'}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-6 font-mono text-[11px] tracking-[0.16em] text-bone-300 uppercase">
        SKU
      </p>
      <p
        className="mt-1 font-mono text-[11px] text-bone-100"
        style={{ wordBreak: 'break-all' }}
        title={sku}
      >
        {sku}
      </p>

      {error && !stockInfo && (
        <p className="mt-4 font-mono text-[11px] text-red-400">{error}</p>
      )}
    </motion.div>
  );
}

interface ConfiguratorFallbackProps {
  loading: boolean;
  error: string | null;
  selection: ConfigurationSelection;
}

export function ConfiguratorFallback({
  loading,
  error,
  selection,
}: ConfiguratorFallbackProps) {
  return (
    <div className="mt-16 rounded-2xl border border-dashed border-bone-50/15 bg-ink-900/40 px-6 py-12 font-mono text-sm leading-relaxed text-bone-300 backdrop-blur">
      {loading && (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-ember-500"
          />
          <p>Loading product options...</p>
        </div>
      )}
      {!loading && error && (
        <p>
          Couldn&apos;t reach the catalog ({error}). The 3D preview still
          reflects your current pick:{' '}
          <span className="text-bone-100">
            {selection.deck} / {selection.wheel} / {selection.truck} /{' '}
            {selection.grip}
          </span>
          .
        </p>
      )}
    </div>
  );
}

export type { VariantOption };
