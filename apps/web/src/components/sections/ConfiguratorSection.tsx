'use client';

/**
 * Configurator, four-step wizard. The user picks the deck, then the wheels,
 * then the trucks, then the grip, and finally lands on a review step with
 * the full breakdown and a CTA into the order section.
 *
 * Each step pushes a highlightPart token into the scene store. The Deck
 * component dims every non-highlighted part so the active component
 * physically pops in the 3D preview.
 *
 * The price panel lives on the left as a sticky sidebar (updates on every
 * step). The right column swaps between SwatchRow (steps 1..4) and the
 * review summary (step 5).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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
import clsx from 'clsx';
import { useSceneStore, type DeckPart } from '@/store/scene';
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

type WizardStep = 0 | 1 | 2 | 3 | 4;

interface StepDef {
  index: WizardStep;
  part: DeckPart;
  axis: 'Deck' | 'Wheels' | 'Trucks' | 'Grip';
  blurb: string;
}

const STEPS: readonly StepDef[] = [
  {
    index: 0,
    part: 'deck',
    axis: 'Deck',
    blurb: 'Pick the graphic. Premium decks add 75 EGP.',
  },
  {
    index: 1,
    part: 'wheel',
    axis: 'Wheels',
    blurb: 'Soft urethane in five colorways.',
  },
  {
    index: 2,
    part: 'truck',
    axis: 'Trucks',
    blurb: 'Hangers in three finishes.',
  },
  {
    index: 3,
    part: 'grip',
    axis: 'Grip',
    blurb: 'Silicon carbide, three patterns.',
  },
];

export function ConfiguratorSection() {
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const setHighlightPart = useSceneStore((s) => s.setHighlightPart);
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
  const [step, setStep] = useState<WizardStep>(0);

  // Fetch the product once.
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

  // Track active section + push the highlightPart for the current step.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.4) {
            setActiveSection('configurator');
            // Sync the highlight to the currently visible step.
            const active = STEPS.find((s) => s.index === step);
            setHighlightPart(active ? active.part : null);
          } else if (!e.isIntersecting) {
            setHighlightPart(null);
          }
        }
      },
      { threshold: [0.4] },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      setHighlightPart(null);
    };
  }, [setActiveSection, setHighlightPart, step]);

  // Whenever the step changes while in-section, push the new highlight.
  useEffect(() => {
    const active = STEPS.find((s) => s.index === step);
    setHighlightPart(active ? active.part : null);
  }, [step, setHighlightPart]);

  const price = useMemo(() => computePrice(product, selection), [product, selection]);
  const stockInfo = useMemo(
    () => computeStock(product, selection),
    [product, selection],
  );
  const breakdown = useMemo(
    () => computeBreakdown(product, selection),
    [product, selection],
  );

  const onPrev = () => setStep((s) => Math.max(0, (s - 1) as WizardStep) as WizardStep);
  const onNext = () =>
    setStep((s) => Math.min(4, (s + 1) as WizardStep) as WizardStep);

  return (
    <section
      ref={sectionRef}
      id="configurator"
      className="relative px-6 py-32 sm:px-10 md:px-14 md:py-40"
    >
      <div className="mx-auto max-w-[1400px]">
        <header className="max-w-2xl">
          <p className="font-mono text-xs tracking-[0.4em] text-bone-300 uppercase">
            03 / configure
          </p>
          <h2
            className="mt-6 font-display font-semibold leading-[0.95] tracking-[-0.02em] text-bone-50"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
          >
            Build yours,
            <br />
            <span className="text-ember-500">step by step.</span>
          </h2>
          <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-bone-200">
            Four choices. The deck on the right re-skins on every click, with
            the active part lit and everything else dimmed.
          </p>
        </header>

        <div className="mt-12 grid gap-12 md:mt-16 md:grid-cols-[1fr_1.1fr] md:gap-16">
          {/* Left: sticky price panel + step indicator */}
          <div className="flex flex-col gap-6 md:sticky md:top-28 md:self-start">
            <StepIndicator step={step} />
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

          {/* Right: wizard body */}
          <div className="flex flex-col gap-8">
            {!product ? (
              <ConfiguratorFallback
                loading={loading}
                error={error}
                selection={selection}
              />
            ) : step < 4 ? (
              <WizardBody
                step={step as 0 | 1 | 2 | 3}
                product={product}
                selection={selection}
                onDeck={setDeck}
                onWheel={setWheel}
                onTruck={setTruck}
                onGrip={setGrip}
              />
            ) : (
              <ReviewBody
                product={product}
                selection={selection}
                price={price}
                breakdown={breakdown}
              />
            )}

            <WizardControls
              step={step}
              onPrev={onPrev}
              onNext={onNext}
              onConfirm={() => scrollToHash('#order')}
              stockOk={stockInfo === null ? true : stockInfo.inStock}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Wizard subcomponents

function StepIndicator({ step }: { step: WizardStep }) {
  return (
    <div className="flex items-center gap-4">
      <p className="font-mono text-[11px] tracking-[0.32em] text-bone-200 uppercase">
        {step < 4
          ? `Step ${String(step + 1).padStart(2, '0')} / 04 · ${STEPS[step]!.axis}`
          : 'Review · 04 / 04'}
      </p>
      <div className="flex flex-1 items-center gap-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => {
          const done = i < step;
          const current = i === step;
          return (
            <span
              key={i}
              className={clsx(
                'h-[3px] flex-1 rounded-full transition-colors',
                done && 'bg-ember-500',
                current && 'bg-ember-400/70',
                !done && !current && 'bg-bone-50/10',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

interface WizardBodyProps {
  step: 0 | 1 | 2 | 3;
  product: Product;
  selection: ConfigurationSelection;
  onDeck: (v: DeckGraphic) => void;
  onWheel: (v: WheelColor) => void;
  onTruck: (v: TruckColor) => void;
  onGrip: (v: GripPattern) => void;
}

function WizardBody({
  step,
  product,
  selection,
  onDeck,
  onWheel,
  onTruck,
  onGrip,
}: WizardBodyProps) {
  const def = STEPS[step]!;
  return (
    <div className="rounded-2xl border border-bone-50/10 bg-ink-900/55 p-6 backdrop-blur-xl md:p-8">
      <p className="font-mono text-[11px] tracking-[0.32em] text-ember-400 uppercase">
        {def.axis}
      </p>
      <p className="mt-2 max-w-md font-sans text-sm leading-relaxed text-bone-200">
        {def.blurb}
      </p>
      <div className="mt-8">
        {step === 0 && (
          <SwatchRow<DeckGraphic>
            axis="Deck"
            options={product.options.deck}
            value={selection.deck}
            onChange={onDeck}
          />
        )}
        {step === 1 && (
          <SwatchRow<WheelColor>
            axis="Wheels"
            options={product.options.wheel}
            value={selection.wheel}
            onChange={onWheel}
          />
        )}
        {step === 2 && (
          <SwatchRow<TruckColor>
            axis="Trucks"
            options={product.options.truck}
            value={selection.truck}
            onChange={onTruck}
          />
        )}
        {step === 3 && (
          <SwatchRow<GripPattern>
            axis="Grip"
            options={product.options.grip}
            value={selection.grip}
            onChange={onGrip}
          />
        )}
      </div>
    </div>
  );
}

interface ReviewBodyProps {
  product: Product;
  selection: ConfigurationSelection;
  price: number | null;
  breakdown: PriceBreakdownRow[];
}

function ReviewBody({ product, selection, price, breakdown }: ReviewBodyProps) {
  const formatEGP = (egp: number) =>
    new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(egp);
  return (
    <div className="rounded-2xl border border-bone-50/10 bg-ink-900/55 p-6 backdrop-blur-xl md:p-8">
      <p className="font-mono text-[11px] tracking-[0.32em] text-ember-400 uppercase">
        Review
      </p>
      <h3
        className="mt-3 font-display font-semibold tracking-[-0.02em] text-bone-50"
        style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.25rem)' }}
      >
        Your PocketDeck.
      </h3>
      <dl className="mt-6 divide-y divide-bone-50/10 border-y border-bone-50/10">
        {(['deck', 'wheel', 'truck', 'grip'] as const).map((axis, i) => {
          const opt = findOption(product, selection, axis);
          return (
            <div
              key={axis}
              className="flex items-center justify-between gap-4 py-4 font-mono text-sm text-bone-100"
            >
              <dt className="text-bone-300 uppercase tracking-[0.24em] text-[11px]">
                {breakdown[i]?.axis ?? axis}
              </dt>
              <dd className="text-right">
                {opt?.label}
                {opt?.priceModifier ? (
                  <span className="ml-3 text-ember-400">
                    +{opt.priceModifier} EGP
                  </span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
      <div className="mt-6 flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
          Total
        </span>
        <span className="font-display text-4xl font-semibold text-bone-50 md:text-5xl">
          {price !== null ? formatEGP(price) : '—'}
        </span>
      </div>
      <p className="mt-3 font-mono text-[11px] text-bone-300">
        Server recomputes this on submit. Cash on delivery.
      </p>
    </div>
  );
}

function WizardControls({
  step,
  onPrev,
  onNext,
  onConfirm,
  stockOk,
}: {
  step: WizardStep;
  onPrev: () => void;
  onNext: () => void;
  onConfirm: () => void;
  stockOk: boolean;
}) {
  const isReview = step === 4;
  return (
    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onPrev}
        disabled={step === 0}
        data-cursor="link"
        className="rounded-full border border-bone-50/15 px-6 py-3 font-mono text-xs tracking-[0.28em] text-bone-100 uppercase transition-colors hover:bg-bone-50/5 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ← Back
      </button>
      {isReview ? (
        <MagneticButton
          type="button"
          onClick={onConfirm}
          disabled={!stockOk}
          innerClassName={clsx(
            'rounded-full px-10 py-4 font-mono text-sm font-medium tracking-[0.24em] uppercase transition-colors',
            stockOk
              ? 'bg-ember-500 text-ink-950 shadow-[0_0_0_1px_rgba(255,91,20,0.4),0_18px_50px_-12px_rgba(255,91,20,0.55)] hover:bg-ember-400'
              : 'cursor-not-allowed bg-bone-50/10 text-bone-300',
          )}
        >
          {stockOk ? 'Add to order →' : 'Out of stock'}
        </MagneticButton>
      ) : (
        <MagneticButton
          type="button"
          onClick={onNext}
          innerClassName="rounded-full bg-ember-500 px-10 py-4 font-mono text-sm font-medium tracking-[0.24em] text-ink-950 uppercase shadow-[0_0_0_1px_rgba(255,91,20,0.4),0_18px_50px_-12px_rgba(255,91,20,0.55)] transition-colors hover:bg-ember-400"
        >
          Next →
        </MagneticButton>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing / lookup helpers

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

function findOption(
  product: Product,
  sel: ConfigurationSelection,
  axis: 'deck' | 'wheel' | 'truck' | 'grip',
): VariantOption | undefined {
  switch (axis) {
    case 'deck':
      return product.options.deck.find((o) => o.value === sel.deck);
    case 'wheel':
      return product.options.wheel.find((o) => o.value === sel.wheel);
    case 'truck':
      return product.options.truck.find((o) => o.value === sel.truck);
    case 'grip':
      return product.options.grip.find((o) => o.value === sel.grip);
  }
}
