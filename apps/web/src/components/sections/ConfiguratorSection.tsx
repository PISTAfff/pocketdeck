'use client';

/**
 * Configurator — fetches the PocketDeck product from the API, renders the four
 * variant axes as swatch lists, and writes the current selection into the
 * scene store. The price recomputes client-side from `basePriceEGP` plus the
 * selected deck's `priceModifier`. The server is authoritative — see CONTRACT.
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
import { SwatchRow } from './SwatchRow';
import {
  ConfiguratorFallback,
  PricePanel,
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

  // Fetch product once.
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

  // Track active section while in view.
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

  return (
    <section
      ref={sectionRef}
      id="configurator"
      className="relative px-6 py-40 md:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-8 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
              03 / configure
            </p>
            <h2 className="mt-6 font-display text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[0.95] tracking-[-0.02em] text-bone-50">
              Make one
              <br />
              <span className="text-ember-500">that&apos;s yours.</span>
            </h2>
          </div>
          <PricePanel
            price={price}
            sku={skuFromSelection(PRODUCT_SLUG, selection)}
            stockInfo={stockInfo}
            loading={loading}
            error={error}
          />
        </header>

        {product ? (
          <div className="mt-20 grid gap-12 md:grid-cols-2 md:gap-x-16">
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

        <div className="mt-16 flex flex-col items-start gap-4">
          <MagneticButton
            href="#order"
            innerClassName="rounded-full bg-ember-500 px-10 py-5 font-mono text-sm tracking-[0.24em] text-ink-950 uppercase transition-colors hover:bg-ember-400"
          >
            Add to order
          </MagneticButton>
          <p className="font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase">
            Final price confirmed at checkout.
          </p>
        </div>
      </div>
    </section>
  );
}

function computePrice(product: Product | null, sel: ConfigurationSelection): number | null {
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
