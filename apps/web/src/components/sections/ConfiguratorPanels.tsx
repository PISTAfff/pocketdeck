'use client';

/**
 * Companion panels for the configurator section: the live price preview and
 * the loading/error fallback shown while the product fetch is in flight.
 */
import { motion } from 'framer-motion';
import type { ConfigurationSelection } from '@pocketdeck/types';

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

interface PricePanelProps {
  price: number | null;
  sku: string;
  stockInfo: VariantStockInfo | null;
  loading: boolean;
  error: string | null;
}

export function PricePanel({
  price,
  sku,
  stockInfo,
  loading,
  error,
}: PricePanelProps) {
  return (
    <motion.div
      layout
      className="self-start rounded-2xl border border-ink-700/60 bg-ink-900/60 p-6 backdrop-blur-md"
    >
      <p className="font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase">
        live preview
      </p>
      <p className="mt-3 font-display text-4xl tracking-[-0.02em] text-bone-50">
        {price !== null ? formatEGP(price) : loading ? '—' : '—'}
      </p>
      <p className="mt-3 font-mono text-xs text-bone-300">
        SKU <span className="text-bone-100">{sku}</span>
      </p>
      <p className="mt-1 font-mono text-xs text-bone-300">
        {stockInfo === null && !error && 'Stock loading…'}
        {stockInfo && stockInfo.inStock && (
          <span className="text-bone-100">
            In stock · {stockInfo.stock} left
          </span>
        )}
        {stockInfo && !stockInfo.inStock && (
          <span className="text-ember-400">Out of stock — pick another mix</span>
        )}
        {error && !stockInfo && <span className="text-red-400">{error}</span>}
      </p>
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
    <div className="mt-20 rounded-2xl border border-dashed border-ink-700/80 px-6 py-10 font-mono text-sm text-bone-300">
      {loading && <p>Loading product options…</p>}
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
