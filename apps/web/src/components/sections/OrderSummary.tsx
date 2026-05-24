'use client';

/**
 * Order summary aside, reflects the current scene-store selections and the
 * client-side price derived from the configurator product + package size.
 *
 * Multi-board packages list each board separately with its own SKU; total
 * lives at the bottom alongside the package savings vs. N solo boards.
 */
import {
  packageSavingsEGP,
  packageTotalEGP,
  skuFromSelection,
  PACKAGE_OFFERS,
} from '@pocketdeck/types';
import type {
  ConfigurationSelection,
  PackageSize,
  Product,
} from '@pocketdeck/types';

interface OrderSummaryProps {
  productSlug: string;
  packageSize: PackageSize;
  selections: ConfigurationSelection[];
  product: Product | null;
}

export function OrderSummary({
  productSlug,
  packageSize,
  selections,
  product,
}: OrderSummaryProps) {
  const total = packageTotalEGP(product, packageSize, selections);
  const savings = packageSavingsEGP(packageSize);
  const offer = PACKAGE_OFFERS.find((o) => o.size === packageSize);
  return (
    <div>
      <span className="tape inline-block">05 · order</span>
      <h2
        className="display-headline mt-6 text-bone-50"
        style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
      >
        Ship it.
      </h2>
      <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-bone-200">
        Cash on delivery across Egypt. We confirm by phone within an hour.
      </p>

      <div className="mt-10 rounded-2xl border border-bone-50/10 bg-ink-900/85 p-6 backdrop-blur-xl">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
            Your build
          </p>
          {offer && (
            <span className="rounded-full bg-ember-500/15 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.22em] text-ember-300 uppercase">
              {offer.label} · {packageSize}-board
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {selections.map((sel, i) => {
            const sku = skuFromSelection(productSlug, sel);
            return (
              <div
                key={i}
                className="rounded-xl border border-bone-50/10 bg-white/[0.02] p-3"
              >
                <p className="font-mono text-[10px] tracking-[0.22em] text-ember-400 uppercase">
                  Board {i + 1}
                  {packageSize > 1 && (
                    <span className="text-bone-300"> / {packageSize}</span>
                  )}
                </p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px] text-bone-100">
                  <dt className="text-bone-300">Deck</dt>
                  <dd className="text-right capitalize">
                    {sel.deck.replace('-', ' ')}
                  </dd>
                  <dt className="text-bone-300">Wheels</dt>
                  <dd className="text-right capitalize">{sel.wheel}</dd>
                  <dt className="text-bone-300">Trucks</dt>
                  <dd className="text-right capitalize">
                    {sel.truck.replace('-', ' ')}
                  </dd>
                  <dt className="text-bone-300">Grip</dt>
                  <dd className="text-right capitalize">{sel.grip}</dd>
                </dl>
                <p
                  className="mt-2 font-mono text-[10px] text-bone-300"
                  style={{ wordBreak: 'break-all' }}
                  title={sku}
                >
                  {sku}
                </p>
              </div>
            );
          })}
        </div>

        {savings > 0 && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-ember-500/15 px-3 py-1 font-mono text-[10px] tracking-[0.22em] text-ember-300 uppercase">
            ✓ You save {savings} EGP
          </p>
        )}

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
