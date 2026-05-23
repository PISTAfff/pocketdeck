'use client';

/**
 * Order summary aside, reflects the current scene-store selection and the
 * client-side price derived from the configurator product.
 *
 * The SKU is rendered on its own row with `word-break: break-all` so the
 * long hyphenated identifier wraps inside the panel without pushing layout.
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
  const sku = skuFromSelection(productSlug, selection);
  return (
    <div>
      <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
        05 / order
      </p>
      <h2
        className="mt-6 font-display font-semibold leading-[0.95] tracking-[-0.02em] text-bone-50"
        style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
      >
        Ship it.
      </h2>
      <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-bone-200">
        Cash on delivery across Egypt. We confirm by phone within an hour.
      </p>

      <div className="mt-10 rounded-2xl border border-bone-50/10 bg-ink-900/85 p-6 backdrop-blur-xl">
        <p className="font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
          Your build
        </p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 font-mono text-[12px] text-bone-100">
          <dt className="text-bone-300">Deck</dt>
          <dd className="text-right capitalize">{selection.deck.replace('-', ' ')}</dd>
          <dt className="text-bone-300">Wheels</dt>
          <dd className="text-right capitalize">{selection.wheel}</dd>
          <dt className="text-bone-300">Trucks</dt>
          <dd className="text-right capitalize">{selection.truck.replace('-', ' ')}</dd>
          <dt className="text-bone-300">Grip</dt>
          <dd className="text-right capitalize">{selection.grip}</dd>
        </dl>

        <div className="mt-5 border-t border-bone-50/10 pt-4">
          <p className="font-mono text-[11px] tracking-[0.24em] text-bone-300 uppercase">
            SKU
          </p>
          <p
            className="mt-1 font-mono text-[11px] text-bone-100"
            style={{ wordBreak: 'break-all' }}
            title={sku}
          >
            {sku}
          </p>
        </div>

        <div className="mt-5 flex items-baseline justify-between border-t border-bone-50/10 pt-5">
          <span className="font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
            Total
          </span>
          <span className="font-display text-3xl font-semibold text-bone-50">
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
