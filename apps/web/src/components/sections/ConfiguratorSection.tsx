'use client';

/**
 * Configurator, a scroll-driven wizard.
 *
 * The section is five viewports tall. While its top is at the viewport top
 * the inner stage pins and the page no longer scrolls — instead each scroll
 * tick snaps to the next wizard step. Steps map to the four variant axes
 * plus a final review screen with a BUY NOW button that scrolls into the
 * order form.
 *
 * Layout when pinned (desktop):
 *
 *   +----------------------+--------------------+
 *   | tape kicker          | (3D deck top-right)|
 *   | headline             |                    |
 *   | step 02 / 05 + bar   |                    |
 *   |                      +--------------------+
 *   | [wizard card]                              |
 *   |                                            |
 *   | price + sku                                |
 *   | [← back] [next →]                          |
 *   +--------------------------------------------+
 *
 * On mobile the section falls back to a normal click-driven wizard, no pin.
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
import { motion, AnimatePresence } from 'framer-motion';
import { useSceneStore, type DeckPart } from '@/store/scene';
import { useConfiguratorStore } from '@/store/configurator';
import { getProduct } from '@/lib/api';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { scrollToHash, scrollToY } from '@/hooks/useLenis';
import { useScrollTrigger, gsap } from '@/hooks/useScrollTrigger';
import { SwatchRow } from './SwatchRow';
import {
  ConfiguratorFallback,
  type PriceBreakdownRow,
  type VariantStockInfo,
} from './ConfiguratorPanels';

const PRODUCT_SLUG = 'pocketdeck';

type WizardStep = 0 | 1 | 2 | 3 | 4;
const STEP_COUNT = 5; // four axes + review
const PIN_VIEWPORTS = STEP_COUNT - 1; // 4 viewports of pinned scroll => 5 snap positions

interface StepDef {
  index: 0 | 1 | 2 | 3;
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
  const ScrollTrigger = useScrollTrigger();
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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stepRef = useRef<WizardStep>(0);
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

  // Desktop: pin the section and convert scroll into step changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', () => {
      const ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: `+=${PIN_VIEWPORTS * 100}%`,
          pin: stage,
          pinSpacing: true,
          scrub: false,
          snap: {
            snapTo: 1 / PIN_VIEWPORTS,
            duration: { min: 0.2, max: 0.5 },
            ease: 'power2.inOut',
          },
          onEnter: () => {
            setActiveSection('configurator');
            const cur = stepRef.current;
            const def = STEPS.find((s) => s.index === cur);
            setHighlightPart(def ? def.part : null);
          },
          onEnterBack: () => {
            setActiveSection('configurator');
            const cur = stepRef.current;
            const def = STEPS.find((s) => s.index === cur);
            setHighlightPart(def ? def.part : null);
          },
          onLeave: () => setHighlightPart(null),
          onLeaveBack: () => setHighlightPart(null),
          onUpdate: (self) => {
            const i = Math.min(
              STEP_COUNT - 1,
              Math.round(self.progress * (STEP_COUNT - 1)),
            ) as WizardStep;
            if (i !== stepRef.current) {
              stepRef.current = i;
              setStep(i);
              const def = STEPS.find((s) => s.index === i);
              setHighlightPart(def ? def.part : null);
            }
          },
        });
      }, section);

      return () => ctx.revert();
    });

    return () => {
      mm.revert();
      setHighlightPart(null);
    };
  }, [ScrollTrigger, setActiveSection, setHighlightPart]);

  // Mobile: also drive activeSection / highlightPart via IntersectionObserver.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 768px)').matches) return;
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.3) {
            setActiveSection('configurator');
            const cur = stepRef.current;
            const def = STEPS.find((s) => s.index === cur);
            setHighlightPart(def ? def.part : null);
          }
        }
      },
      { threshold: [0.3] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [setActiveSection, setHighlightPart]);

  const price = useMemo(() => computePrice(product, selection), [product, selection]);
  const stockInfo = useMemo(
    () => computeStock(product, selection),
    [product, selection],
  );
  const breakdown = useMemo(
    () => computeBreakdown(product, selection),
    [product, selection],
  );

  /** Smoothly jump to step k via Lenis-scrolling the page to the matching pin position. */
  const scrollToStep = (k: WizardStep) => {
    const section = sectionRef.current;
    if (!section) {
      setStep(k);
      return;
    }
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const totalScroll = window.innerHeight * PIN_VIEWPORTS;
    // Bias slightly past each snap point so ScrollTrigger's snap doesn't bounce
    // us backwards on a tie.
    const targetY = sectionTop + (k / (STEP_COUNT - 1)) * totalScroll + 2;
    scrollToY(targetY, 0.7);
  };

  return (
    <section
      ref={sectionRef}
      id="configurator"
      // No background fill: the persistent canvas (z-0) needs to show
      // through this section so the deck reads in the right column. The
      // body is already ink-950, so the visual remains dark.
      className="relative"
      style={{
        // Five steps means four "advances" * 100vh + one starting viewport.
        minHeight: `${PIN_VIEWPORTS * 100 + 100}vh`,
      }}
    >
      <div
        ref={stageRef}
        className="hidden min-h-screen flex-col px-6 py-20 sm:px-10 md:flex md:px-14"
      >
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col">
          {/* Top row: kicker + headline + step indicator */}
          <header className="grid items-end gap-8 md:grid-cols-[1.05fr_1fr]">
            <div>
              <span className="tape inline-block">03 · configure</span>
              <h2
                className="display-headline mt-6 text-bone-50"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
              >
                Build yours,
                <br />
                <span className="text-ember-500">step by step.</span>
              </h2>
              <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-bone-100">
                Scroll to move through the four axes. The deck on the right
                relights the active part on every step.
              </p>
            </div>
            <StepRail step={step} />
          </header>

          {/* Two-column body: wizard card on the LEFT, deck reserved area on the RIGHT */}
          <div className="mt-12 grid flex-1 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-12">
            <div className="flex flex-col gap-6">
              <AnimatePresence mode="wait">
                {step < 4 ? (
                  <WizardCard
                    key={`step-${step}`}
                    step={step as 0 | 1 | 2 | 3}
                    product={product}
                    selection={selection}
                    onDeck={setDeck}
                    onWheel={setWheel}
                    onTruck={setTruck}
                    onGrip={setGrip}
                    loading={loading}
                    error={error}
                  />
                ) : (
                  <ReviewCard
                    key="review"
                    product={product}
                    selection={selection}
                    price={price}
                    stockInfo={stockInfo}
                    breakdown={breakdown}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Right column reserved for the deck. Canvas keyframe puts the
                deck in this region while the user is in configurator. */}
            <div aria-hidden className="hidden md:block" />
          </div>

          {/* Bottom row: controls */}
          <footer className="mt-10 flex items-center justify-between border-t border-bone-50/10 pt-6">
            <button
              type="button"
              onClick={() => scrollToStep(Math.max(0, step - 1) as WizardStep)}
              disabled={step === 0}
              data-cursor="link"
              className="rounded-full border border-bone-50/15 px-6 py-3 font-mono text-xs tracking-[0.28em] text-bone-100 uppercase transition-colors hover:bg-bone-50/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Back
            </button>

            <div className="hidden font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase md:block">
              {step < 4
                ? 'Scroll · or click next'
                : 'Final build · ready to ship'}
            </div>

            {step < 4 ? (
              <MagneticButton
                type="button"
                onClick={() => scrollToStep((step + 1) as WizardStep)}
                innerClassName="rounded-full bg-ember-500 px-10 py-4 font-mono text-sm font-medium tracking-[0.24em] text-ink-950 uppercase shadow-[0_0_0_1px_rgba(255,91,20,0.4),0_18px_50px_-12px_rgba(255,91,20,0.55)] transition-colors hover:bg-ember-400"
              >
                Next →
              </MagneticButton>
            ) : (
              <MagneticButton
                type="button"
                onClick={() => scrollToHash('#order')}
                disabled={stockInfo !== null && !stockInfo.inStock}
                innerClassName={clsx(
                  'rounded-full px-12 py-4 font-mono text-sm font-medium tracking-[0.28em] uppercase transition-colors',
                  stockInfo === null || stockInfo.inStock
                    ? 'bg-ember-500 text-ink-950 shadow-[0_0_0_1px_rgba(255,91,20,0.4),0_22px_60px_-12px_rgba(255,91,20,0.65)] hover:bg-ember-400'
                    : 'cursor-not-allowed bg-bone-50/10 text-bone-300',
                )}
              >
                {stockInfo && !stockInfo.inStock ? 'Out of stock' : 'Buy now →'}
              </MagneticButton>
            )}
          </footer>
        </div>
      </div>

      {/* Mobile fallback, click-driven, no pin. */}
      <div className="flex flex-col gap-8 px-6 py-20 sm:px-10 md:hidden">
        <span className="tape inline-block">03 · configure</span>
        <h2
          className="display-headline text-bone-50"
          style={{ fontSize: 'clamp(2rem, 9vw, 3.5rem)' }}
        >
          Build yours,
          <br />
          <span className="text-ember-500">step by step.</span>
        </h2>
        <StepRail step={step} />
        {step < 4 ? (
          <WizardCard
            step={step as 0 | 1 | 2 | 3}
            product={product}
            selection={selection}
            onDeck={setDeck}
            onWheel={setWheel}
            onTruck={setTruck}
            onGrip={setGrip}
            loading={loading}
            error={error}
          />
        ) : (
          <ReviewCard
            product={product}
            selection={selection}
            price={price}
            stockInfo={stockInfo}
            breakdown={breakdown}
          />
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1) as WizardStep)}
            disabled={step === 0}
            className="rounded-full border border-bone-50/15 px-5 py-2 font-mono text-xs tracking-[0.24em] text-bone-100 uppercase disabled:opacity-30"
          >
            ← Back
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1) as WizardStep)}
              className="rounded-full bg-ember-500 px-6 py-2 font-mono text-xs tracking-[0.24em] text-ink-950 uppercase"
            >
              Next →
            </button>
          ) : (
            <a
              href="#order"
              onClick={(e) => {
                e.preventDefault();
                scrollToHash('#order');
              }}
              className="rounded-full bg-ember-500 px-6 py-2 font-mono text-xs tracking-[0.28em] text-ink-950 uppercase"
            >
              Buy now →
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Wizard subcomponents

function StepRail({ step }: { step: WizardStep }) {
  const label =
    step < 4
      ? `Step ${String(step + 1).padStart(2, '0')} / 05 · ${STEPS[step]!.axis}`
      : 'Review · 05 / 05';
  return (
    <div className="flex flex-col items-start gap-3 md:items-end">
      <p className="font-mono text-[11px] tracking-[0.32em] text-bone-200 uppercase">
        {label}
      </p>
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={clsx(
              'h-1 w-10 rounded-full transition-colors',
              i < step && 'bg-ember-500',
              i === step && 'bg-ember-400/80',
              i > step && 'bg-bone-50/10',
            )}
          />
        ))}
      </div>
    </div>
  );
}

interface WizardCardProps {
  step: 0 | 1 | 2 | 3;
  product: Product | null;
  selection: ConfigurationSelection;
  onDeck: (v: DeckGraphic) => void;
  onWheel: (v: WheelColor) => void;
  onTruck: (v: TruckColor) => void;
  onGrip: (v: GripPattern) => void;
  loading: boolean;
  error: string | null;
}

function WizardCard({
  step,
  product,
  selection,
  onDeck,
  onWheel,
  onTruck,
  onGrip,
  loading,
  error,
}: WizardCardProps) {
  const def = STEPS[step]!;

  if (!product) {
    return (
      <ConfiguratorFallback loading={loading} error={error} selection={selection} />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
      className="rounded-2xl border border-bone-50/10 bg-ink-900/65 p-7 backdrop-blur-xl md:p-9"
    >
      <p className="font-mono text-[11px] tracking-[0.32em] text-ember-400 uppercase">
        {def.axis}
      </p>
      <p className="mt-2 max-w-md font-sans text-sm leading-relaxed text-bone-100">
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
    </motion.div>
  );
}

interface ReviewCardProps {
  product: Product | null;
  selection: ConfigurationSelection;
  price: number | null;
  stockInfo: VariantStockInfo | null;
  breakdown: PriceBreakdownRow[];
}

function ReviewCard({
  product,
  selection,
  price,
  stockInfo,
  breakdown,
}: ReviewCardProps) {
  const formatEGP = (egp: number) =>
    new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(egp);

  const sku = product ? skuFromSelection(product.slug, selection) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
      className="rounded-2xl border border-bone-50/10 bg-ink-900/65 p-7 backdrop-blur-xl md:p-9"
    >
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] tracking-[0.32em] text-ember-400 uppercase">
          Your build
        </p>
        {stockInfo && (
          <span
            className={clsx(
              'rounded-full px-3 py-1 font-mono text-[10px] tracking-[0.28em] uppercase',
              stockInfo.inStock
                ? 'bg-bone-50/5 text-bone-200'
                : 'bg-ember-500/10 text-ember-400',
            )}
          >
            {stockInfo.inStock ? `In stock · ${stockInfo.stock}` : 'Out of stock'}
          </span>
        )}
      </div>

      <h3
        className="mt-3 font-display font-normal tracking-[-0.005em] text-bone-50"
        style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', lineHeight: 0.9 }}
      >
        PocketDeck assembled.
      </h3>

      <dl className="mt-6 divide-y divide-bone-50/10 border-y border-bone-50/10">
        {breakdown.map((row) => (
          <div
            key={row.axis}
            className="flex items-center justify-between gap-4 py-3 font-mono text-sm text-bone-100"
          >
            <dt className="text-[11px] tracking-[0.28em] text-bone-300 uppercase">
              {row.axis}
            </dt>
            <dd className="text-right">
              <span>{row.variant}</span>
              <span
                className={clsx(
                  'ml-3 text-[12px]',
                  row.amount > 0 ? 'text-ember-400' : 'text-bone-500/70',
                )}
              >
                {row.amount > 0 ? `+${row.amount} EGP` : 'incl.'}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
          Total
        </span>
        <span
          className="font-display text-bone-50"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', lineHeight: 0.9 }}
        >
          {price !== null ? formatEGP(price) : '—'}
        </span>
      </div>

      {sku && (
        <p
          className="mt-5 font-mono text-[10px] tracking-[0.12em] text-bone-300"
          style={{ wordBreak: 'break-all' }}
        >
          SKU · {sku}
        </p>
      )}
    </motion.div>
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
