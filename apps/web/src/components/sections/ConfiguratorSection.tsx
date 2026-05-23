'use client';

/**
 * Configurator, fetches the PocketDeck product, lets you swap the four
 * variant axes, writes the selection into the scene store, and computes the
 * live price client-side. The server is authoritative; see CONTRACT.md.
 *
 * Layout: heading + price panel on the LEFT column, swatch grid on the RIGHT.
 * The deck (positioned at +X in the configurator keyframe) renders in the
 * background to the right of the price panel; nothing sits behind heavy text.
 */
import { useEffect, useMemo, useRef } from 'react';
import type {
  ConfigurationSelection,
  DeckGraphic,
  GripPattern,
  Product,
  TruckColor,
  VariantOption,
  WheelColor,
} from '@pocketdeck/types';
import { skuFromSelection } from '@pocketdeck/types';
import { useSceneStore } from '@/store/scene';
import { useConfiguratorStore } from '@/store/configurator';
import { getProduct } from '@/lib/api';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { scrollToHash } from '@/hooks/useLenis';
import { SwatchRow } from './SwatchRow';
import {
  ConfiguratorFallback,
  PricePanel,
  type PriceBreakdownRow,
  type VariantStockInfo,
} from './ConfiguratorPanels';

const PRODUCT_SLUG = 'pocketdeck';

export function ConfiguratorSection() {
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const selection = useSceneStore((s) => s.selection);
  const setDeck = useSceneStore((s) => s.setDeck);
  const setWheel = useSceneStore((s) => s.setWheel);
  const setTruck = useSceneStore((s) => s.setTruck);
  const setGrip = useSceneStore((s) => s.setGrip);

  const product = useConfiguratorStore((s) => s.product);
  const loading = useConfiguratorStore((s) => s.loading);
  const error = useConfiguratorStore((s) => s.error);
  const setProduct = useConfiguratorStore((s) => s.setProduct);
  const setLoading = useConfiguratorStore((s) => s.setLoading);
  const setError = useConfiguratorStore((s) => s.setError);

  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProduct(PRODUCT_SLUG)
      .then((p) => {
        if (mounted) setProduct(p);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load product.';
        setError(msg);
        console.warn('[configurator] product fetch failed:', msg);
      });
    return () => {
      mounted = false;
    };
  }, [setProduct, setLoading, setError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.4) {
            setActiveSection('configurator');
          }
        }
      },
      { threshold: [0.4] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [setActiveSection]);

  const price = useMemo(() => computePrice(product, selection), [product, selection]);
  const stockInfo = useMemo(
    () => computeStock(product, selection),
    [product, selection],
  );
  const breakdown = useMemo(
    () => computeBreakdown(product, selection),
    [product, selection],
  );

  return (
    <section
      ref={sectionRef}
      id="configurator"
      className="relative px-6 py-32 sm:px-10 md:px-14 md:py-40"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-12 md:grid-cols-[1.05fr_1fr] md:gap-16">
          {/* Left column: heading + live price panel */}
          <div className="flex flex-col gap-8 md:gap-10">
            <div>
              <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
                03 / configure
              </p>
              <h2
                className="mt-6 font-display font-semibold leading-[0.95] tracking-[-0.02em] text-bone-50"
                style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
              >
                Make one
                <br />
                <span className="text-ember-500">that&apos;s yours.</span>
              </h2>
              <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-bone-200">
                Four axes, 180 combinations. Click any swatch and the deck
                recolors in real time. The total below is what you pay.
              </p>
            </div>
            <PricePanel
              product={product}
              price={price}
              sku={skuFromSelection(PRODUCT_SLUG, selection)}
              stockInfo={stockInfo}
              breakdown={breakdown}
              loading={loading}
              error={error}
            />
          </div>

          {/* Right column: swatch axes */}
          {product ? (
            <div className="grid gap-10 sm:grid-cols-2 md:gap-12">
              <SwatchRow<DeckGraphic>
                axis="Deck"
                options={product.options.deck}
                value={selection.deck}
                onChange={setDeck}
              />
              <SwatchRow<WheelColor>
                axis="Wheels"
                options={product.options.wheel}
                value={selection.wheel}
                onChange={setWheel}
              />
              <SwatchRow<TruckColor>
                axis="Trucks"
                options={product.options.truck}
                value={selection.truck}
                onChange={setTruck}
              />
              <SwatchRow<GripPattern>
                axis="Grip"
                options={product.options.grip}
                value={selection.grip}
                onChange={setGrip}
              />
            </div>
          ) : (
            <ConfiguratorFallback
              loading={loading}
              error={error}
              selection={selection}
            />
          )}
        </div>

        <div className="mt-16 flex flex-col items-start gap-5 border-t border-bone-50/10 pt-10 md:flex-row md:items-center md:justify-between md:gap-8">
          <p className="max-w-md font-sans text-sm text-bone-200 md:text-base">
            Happy with the build? Reserve this configuration. Cash on delivery
            across Egypt; we confirm by phone within an hour.
          </p>
          <MagneticButton
            href="#order"
            onClick={(e) => {
              e.preventDefault();
              scrollToHash('#order');
            }}
            innerClassName="rounded-full border border-bone-50/15 px-8 py-4 font-mono text-xs tracking-[0.32em] text-bone-50 uppercase transition-colors hover:border-bone-50/30 hover:bg-bone-50/5"
          >
            Add to order
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

function computePrice(
  product: Product | null,
  sel: ConfigurationSelection,
): number | null {
  if (!product) return null;
  const deck = product.options.deck.find(
    (d): d is VariantOption<DeckGraphic> => d.value === sel.deck,
  );
  const mod = deck?.priceModifier ?? 0;
  return product.basePriceEGP + mod;
}

function computeStock(
  product: Product | null,
  sel: ConfigurationSelection,
): VariantStockInfo | null {
  if (!product) return null;
  const sku = skuFromSelection(product.slug, sel);
  const v = product.variants.find((variant) => variant.sku === sku);
  if (!v) return { inStock: false, stock: 0 };
  return { inStock: v.stock > 0, stock: v.stock };
}

function computeBreakdown(
  product: Product | null,
  sel: ConfigurationSelection,
): PriceBreakdownRow[] {
  if (!product) return [];
  const find = <T extends string>(
    options: VariantOption<T>[],
    value: T,
  ): VariantOption<T> | undefined => options.find((o) => o.value === value);
  const deck = find(product.options.deck, sel.deck);
  const wheel = find(product.options.wheel, sel.wheel);
  const truck = find(product.options.truck, sel.truck);
  const grip = find(product.options.grip, sel.grip);
  return [
    { axis: 'Deck', variant: deck?.label ?? sel.deck, amount: deck?.priceModifier ?? 0 },
    {
      axis: 'Wheels',
      variant: wheel?.label ?? sel.wheel,
      amount: wheel?.priceModifier ?? 0,
    },
    {
      axis: 'Trucks',
      variant: truck?.label ?? sel.truck,
      amount: truck?.priceModifier ?? 0,
    },
    { axis: 'Grip', variant: grip?.label ?? sel.grip, amount: grip?.priceModifier ?? 0 },
  ];
}
