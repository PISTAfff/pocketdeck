'use client';

/**
 * Order summary aside — reflects the current scene-store selection and the
 * client-side price derived from the configurator product.
 */
import type { ConfigurationSelection, Product } from '@pocketdeck/types';
import { skuFromSelection } from '@pocketdeck/types';

interface OrderSummaryProps {
  productSlug: string;
  selection: ConfigurationSelection;
  product: Product | null;
}

export function OrderSummary({
  productSlug,
  selection,
  product,
}: OrderSummaryProps) {
  const total = derivePrice(product, selection);
  return (
    <div>
      <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
        05 / order
      </p>
      <h2 className="mt-6 font-display text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[0.95] tracking-[-0.02em] text-bone-50">
        Ship it.
      </h2>
      <p className="mt-6 max-w-md font-sans text-base text-bone-200">
        Cash on delivery across Egypt. We confirm by phone within an hour.
      </p>

      <div className="mt-10 rounded-2xl border border-ink-700/60 bg-ink-900/60 p-6 backdrop-blur-md">
        <p className="font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase">
          Your build
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-y-3 font-mono text-xs text-bone-100">
          <dt className="text-bone-300">Deck</dt>
          <dd className="text-right">{selection.deck}</dd>
          <dt className="text-bone-300">Wheels</dt>
          <dd className="text-right">{selection.wheel}</dd>
          <dt className="text-bone-300">Trucks</dt>
          <dd className="text-right">{selection.truck}</dd>
          <dt className="text-bone-300">Grip</dt>
          <dd className="text-right">{selection.grip}</dd>
          <dt className="text-bone-300">SKU</dt>
          <dd className="text-right text-bone-50">
            {skuFromSelection(productSlug, selection)}
          </dd>
        </dl>
        <div className="mt-6 flex items-baseline justify-between border-t border-ink-700/60 pt-4">
          <span className="font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase">
            Total
          </span>
          <span className="font-display text-2xl text-bone-50">
            {total !== null ? `${total} EGP` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

function derivePrice(
  product: Product | null,
  selection: ConfigurationSelection,
): number | null {
  if (!product) return null;
  const deck = product.options.deck.find((d) => d.value === selection.deck);
  const mod = deck?.priceModifier ?? 0;
  return product.basePriceEGP + mod;
}
