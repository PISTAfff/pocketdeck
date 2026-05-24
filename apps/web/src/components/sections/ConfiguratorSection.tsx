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
import { scrollToHash } from '@/hooks/useLenis';
import { SwatchRow } from './SwatchRow';
import {
  ConfiguratorFallback,
  type PriceBreakdownRow,
  type VariantStockInfo,
} from './ConfiguratorPanels';
import { PresetPicker } from './PresetPicker';
import { PackageHero } from './PackageHero';
import { SkateSwitcher } from './SkateSwitcher';
import {
  PACKAGE_OFFERS,
  packageSavingsEGP,
  packageTotalEGP,
} from '@pocketdeck/types';

const PRODUCT_SLUG = 'pocketdeck';

// 0 = Package picker, 1..5 = per-board edit steps (Deck, Wheels,
// Bearings, Trucks, Grip), 6 = Review. Multi-board orders repeat the
// edit phase once per board, driven by activeSkateIndex in the scene
// store.
type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type EditStepIndex = 0 | 1 | 2 | 3 | 4;
const PACKAGE_STEP: WizardStep = 0;
const REVIEW_STEP: WizardStep = 6;
const FIRST_EDIT_STEP: WizardStep = 1;
const LAST_EDIT_STEP: WizardStep = 5;

/**
 * A wizard step is either a configurable axis (Deck, Wheels, Trucks, Grip)
 * or an informational step like Bearings - same step rail, same Next/Back
 * controls, but no SwatchRow because there's nothing to pick.
 */
interface StepDef {
  index: EditStepIndex;
  part: DeckPart;
  axis: 'Deck' | 'Wheels' | 'Bearings' | 'Trucks' | 'Grip';
  blurb: string;
  /** `info` steps render a fact panel instead of a SwatchRow. */
  kind: 'select' | 'info';
}

const STEPS: readonly StepDef[] = [
  {
    index: 0,
    part: 'deck',
    axis: 'Deck',
    blurb: 'Pick the graphic. Premium decks add 75 EGP.',
    kind: 'select',
  },
  {
    index: 1,
    part: 'wheel',
    axis: 'Wheels',
    blurb: 'Soft urethane in five colorways.',
    kind: 'select',
  },
  {
    index: 2,
    part: 'bearings',
    axis: 'Bearings',
    blurb:
      "Steel ABEC-7, sealed, pre-lubed. Every board ships with the same set - this step's just here so you can see what's spinning inside the wheels.",
    kind: 'info',
  },
  {
    index: 3,
    part: 'truck',
    axis: 'Trucks',
    blurb: 'Hangers in three finishes.',
    kind: 'select',
  },
  {
    index: 4,
    part: 'grip',
    axis: 'Grip',
    blurb: 'Silicon carbide, three patterns.',
    kind: 'select',
  },
];

export function ConfiguratorSection() {
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const setHighlightPart = useSceneStore((s) => s.setHighlightPart);
  const selection = useSceneStore((s) => s.selection);
  const selections = useSceneStore((s) => s.selections);
  const setDeck = useSceneStore((s) => s.setDeck);
  const setWheel = useSceneStore((s) => s.setWheel);
  const setTruck = useSceneStore((s) => s.setTruck);
  const setGrip = useSceneStore((s) => s.setGrip);
  const packageSize = useSceneStore((s) => s.packageSize);
  const activeSkateIndex = useSceneStore((s) => s.activeSkateIndex);
  const setActiveSkateIndex = useSceneStore((s) => s.setActiveSkateIndex);
  const setWizardPhase = useSceneStore((s) => s.setWizardPhase);

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

  // No pin. The section is 2 viewports tall on desktop with a sticky
  // stage inside, so the user has dwell time to click through Next/Back
  // without the page locking up. Activation tracking only.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const section = sectionRef.current;
    if (!section) return;

    const onActive = () => {
      setActiveSection('configurator');
      const def = STEPS.find((s) => s.index === stepRef.current);
      setHighlightPart(def ? def.part : null);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.3) {
            onActive();
          } else if (!e.isIntersecting) {
            // Drop the highlight when we scroll past so the deck stops
            // dimming the non-active part.
            setHighlightPart(null);
          }
        }
      },
      { threshold: [0, 0.3, 0.6] },
    );
    io.observe(section);
    return () => {
      io.disconnect();
      setHighlightPart(null);
    };
  }, [setActiveSection, setHighlightPart]);

  // Keep the scene's highlightPart in lock-step with the wizard step.
  // Only edit-phase steps map to a part; Package + Review clear the
  // highlight so the deck reads at full brightness.
  useEffect(() => {
    stepRef.current = step;
    if (step >= FIRST_EDIT_STEP && step <= LAST_EDIT_STEP) {
      const def = STEPS[(step - 1) as EditStepIndex];
      setHighlightPart(def ? def.part : null);
    } else {
      setHighlightPart(null);
    }

    // Drive the wizardPhase store flag - SceneRoot reads this and hides
    // the main 3D canvas during the package phase so the package cards
    // own the right column with their own R3F mini scenes.
    if (step === PACKAGE_STEP) {
      setWizardPhase('package');
    } else if (step === REVIEW_STEP) {
      setWizardPhase('review');
    } else {
      setWizardPhase('edit');
    }
  }, [step, setHighlightPart, setWizardPhase]);

  // Clear the wizardPhase when the configurator unmounts so other
  // sections see a clean canvas-opacity calculation.
  useEffect(() => {
    return () => setWizardPhase(null);
  }, [setWizardPhase]);

  // Stock + breakdown are computed against the package as a whole. With
  // multi-board orders we surface the total + the most-restrictive
  // stock state so a single out-of-stock board still blocks "Buy now".
  const totalEGP = useMemo(
    () => packageTotalEGP(product, packageSize, selections),
    [product, packageSize, selections],
  );
  const savingsEGP = useMemo(() => packageSavingsEGP(packageSize), [packageSize]);
  const stockInfo = useMemo<VariantStockInfo | null>(() => {
    if (!product) return null;
    let inStock = true;
    let lowestStock = Infinity;
    for (const sel of selections) {
      const info = computeStock(product, sel);
      if (!info) continue;
      if (!info.inStock) inStock = false;
      lowestStock = Math.min(lowestStock, info.stock);
    }
    return { inStock, stock: lowestStock === Infinity ? 0 : lowestStock };
  }, [product, selections]);
  const breakdown = useMemo(
    () => computeBreakdown(product, selection),
    [product, selection],
  );

  /** Move forward through the wizard, threading through every board. */
  const goNext = () => {
    if (step === PACKAGE_STEP) {
      setActiveSkateIndex(0);
      setStep(FIRST_EDIT_STEP);
      return;
    }
    if (step >= FIRST_EDIT_STEP && step < LAST_EDIT_STEP) {
      setStep((step + 1) as WizardStep);
      return;
    }
    if (step === LAST_EDIT_STEP) {
      // End of one board's edits: either advance to next board, or
      // jump to the review screen if this was the final board.
      if (activeSkateIndex < packageSize - 1) {
        setActiveSkateIndex(activeSkateIndex + 1);
        setStep(FIRST_EDIT_STEP);
      } else {
        setStep(REVIEW_STEP);
      }
    }
  };

  /** Move backward, mirroring goNext - back from a board's first step
   *  goes to the previous board's last step. */
  const goBack = () => {
    if (step === PACKAGE_STEP) return;
    if (step === FIRST_EDIT_STEP) {
      if (activeSkateIndex > 0) {
        setActiveSkateIndex(activeSkateIndex - 1);
        setStep(LAST_EDIT_STEP);
      } else {
        setStep(PACKAGE_STEP);
      }
      return;
    }
    if (step > FIRST_EDIT_STEP && step <= LAST_EDIT_STEP) {
      setStep((step - 1) as WizardStep);
      return;
    }
    if (step === REVIEW_STEP) {
      setActiveSkateIndex(packageSize - 1);
      setStep(LAST_EDIT_STEP);
    }
  };

  /** Jump to any step (used by the step rail when in edit phase, and
   *  to bounce back to the Package picker). Multi-board jumps preserve
   *  the active board. */
  const goToStep = (k: WizardStep) => {
    if (k === PACKAGE_STEP) {
      setStep(PACKAGE_STEP);
      return;
    }
    if (k === REVIEW_STEP) {
      setStep(REVIEW_STEP);
      return;
    }
    setStep(k);
  };

  return (
    <section
      ref={sectionRef}
      id="configurator"
      // No background fill: the persistent canvas needs to read through this
      // section. The body is already ink-950, so the page stays dark.
      // Desktop: 2 viewports tall so the sticky stage has 1 viewport of
      // dwell time before it exits. Mobile uses content-driven height.
      className="relative md:h-[200vh]"
    >
      <div
        ref={stageRef}
        // CSS sticky stage. The outer section is 2 viewports tall (see
        // section className below) so this stage stays at top:0 while the
        // user scrolls through that 2-viewport range, giving them dwell
        // time to click Next/Back without any JS pin lockup.
        className="relative hidden h-screen flex-col px-6 pt-20 pb-6 sm:px-10 md:sticky md:top-0 md:flex md:px-14"
      >
        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col">
          {/* Page kicker + heading - the heading copy differs depending
              on whether the user is picking a package or customizing. */}
          <header className="grid shrink-0 items-start gap-8 md:grid-cols-[1.05fr_1fr]">
            <div className="text-tint">
              <span className="tape inline-block">04 · configure</span>
              <h2
                className="display-headline mt-4 text-bone-50"
                style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.75rem)' }}
              >
                {step === PACKAGE_STEP ? (
                  <>
                    Pick your{' '}
                    <span className="spray-text text-ember-500">stack</span>.
                  </>
                ) : (
                  <>
                    Build yours,
                    <br />
                    <span className="spray-text text-ember-500">step by step.</span>
                  </>
                )}
              </h2>
              <div className="mt-4 max-w-md">
                <StepRail
                  step={step}
                  onJump={(target) => goToStep(target)}
                  align="start"
                />
              </div>
            </div>
            <div aria-hidden className="hidden md:block" />
          </header>

          {/* Persistent 2-column grid. Left column = wizard cards (or
              package context copy in the package phase). Right column =
              where the main 3D canvas peeks through normally, OR where
              the PackageHero cards mount during package selection.
              overflow-y-clip (not auto) keeps the transient scrollbar
              from appearing during the phase-swap entrance animations -
              cards fade in from y:24 which briefly pushes overflow.
              All edit-phase content fits in the stage by design, so we
              don't need a real scrollbar here. */}
          <div className="mt-5 grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-12 overflow-y-clip pr-2">
            <div className="flex max-w-md flex-col gap-4">
              {step >= FIRST_EDIT_STEP && step <= LAST_EDIT_STEP && (
                <SkateSwitcher />
              )}
              {step >= FIRST_EDIT_STEP && step <= LAST_EDIT_STEP && (
                <PresetPicker />
              )}
              <AnimatePresence mode="wait">
                {step === PACKAGE_STEP && (
                  <motion.div
                    key="package-context"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="halftone-corner rounded-2xl border border-bone-50/10 bg-white/[0.04] p-5">
                      <p className="font-mono text-[11px] tracking-[0.32em] text-ember-400 uppercase">
                        Step 01 · package
                      </p>
                      <p className="mt-2 max-w-md font-sans text-sm leading-relaxed text-bone-50">
                        How many boards in this drop? Each one gets its
                        own custom build in the next steps. Bigger packs
                        save more.
                      </p>
                      <p className="mt-4 font-mono text-[10px] tracking-[0.22em] text-bone-200/65 uppercase">
                        Hover a card → preview.
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.22em] text-bone-200/65 uppercase">
                        Click → start building.
                      </p>
                    </div>

                    {/* What you get per board */}
                    <div className="rounded-2xl border border-bone-50/10 bg-white/[0.02] p-5">
                      <p className="font-mono text-[10px] tracking-[0.28em] text-bone-200/70 uppercase">
                        every board ships with
                      </p>
                      <ul className="mt-3 grid gap-2">
                        {[
                          ['7-ply Canadian maple', 'CNC nose + tail'],
                          ['Cast aluminum trucks', 'Hand-tuned bushings'],
                          ['Urethane 7.7 mm wheels', 'Five colorways'],
                          ['ABEC-7 sealed bearings', 'Pre-lubed'],
                          ['Silicon carbide grip', 'Three patterns'],
                        ].map(([title, sub]) => (
                          <li
                            key={title}
                            className="flex items-baseline gap-3 font-sans text-[12px] text-bone-100"
                          >
                            <span
                              aria-hidden
                              className="mt-1 inline-block h-1 w-3 shrink-0 bg-ember-500"
                            />
                            <span className="flex-1">
                              <span className="text-bone-50">{title}</span>
                              <span className="ml-1 font-mono text-[10px] tracking-[0.18em] text-bone-200/55 uppercase">
                                · {sub}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Trust strip */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ['COD', 'Cash on delivery'],
                        ['24H', 'Cairo · Giza · Alex'],
                        ['NO APP', 'Pure mechanics'],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="border border-bone-50/10 bg-ink-900/40 px-3 py-2 text-center"
                        >
                          <p className="font-display text-base text-ember-400">
                            {k}
                          </p>
                          <p className="mt-0.5 font-mono text-[9px] tracking-[0.18em] text-bone-200/60 uppercase">
                            {v}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {step >= FIRST_EDIT_STEP && step <= LAST_EDIT_STEP && (
                  <WizardCard
                    key={`step-${step}-skate-${activeSkateIndex}`}
                    step={(step - 1) as EditStepIndex}
                    product={product}
                    selection={selection}
                    onDeck={setDeck}
                    onWheel={setWheel}
                    onTruck={setTruck}
                    onGrip={setGrip}
                    loading={loading}
                    error={error}
                    activeSkateIndex={activeSkateIndex}
                    packageSize={packageSize}
                  />
                )}
                {step === REVIEW_STEP && (
                  <ReviewCard
                    key="review"
                    product={product}
                    selections={selections}
                    packageSize={packageSize}
                    totalEGP={totalEGP}
                    savingsEGP={savingsEGP}
                    stockInfo={stockInfo}
                    breakdown={breakdown}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT column. Normally empty (the persistent main 3D
                canvas peeks through this region of the page). During
                the package phase, the 3 cards mount HERE - replacing
                the deck with the cards. SceneRoot watches wizardPhase
                and hides the main canvas while we're on this step.
                overflow-hidden keeps the sliding skate backdrop from
                creating phantom scrollbars during its entry/exit. */}
            <div className="relative hidden h-full overflow-hidden md:block">
              <AnimatePresence mode="wait" initial={false}>
                {step === PACKAGE_STEP && (
                  <PackageHero
                    key="package-hero"
                    onPick={() => {
                      setActiveSkateIndex(0);
                      setStep(FIRST_EDIT_STEP);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer participates in the flex column so it always sits at
              the bottom of the visible stage. shrink-0 prevents it from
              collapsing if the scroll area requests more space. */}
          <footer className="mt-4 flex shrink-0 items-center justify-between gap-4 border-t border-bone-50/10 pt-4">
            <button
              type="button"
              onClick={goBack}
              disabled={step === PACKAGE_STEP}
              data-cursor="link"
              className="rounded-full bg-ink-700 px-8 py-3 font-mono text-xs font-medium tracking-[0.24em] text-bone-50 uppercase transition-colors hover:bg-ink-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Back
            </button>

            <div className="hidden font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase lg:block">
              {footerHint(step, activeSkateIndex, packageSize)}
            </div>

            {step < REVIEW_STEP ? (
              <MagneticButton
                type="button"
                onClick={goNext}
                innerClassName="rounded-full bg-ember-500 px-8 py-3 font-mono text-xs font-medium tracking-[0.24em] text-ink-950 uppercase shadow-[0_0_0_1px_rgba(255,91,20,0.4),0_18px_50px_-12px_rgba(255,91,20,0.55)] transition-colors hover:bg-ember-400"
              >
                {nextLabel(step, activeSkateIndex, packageSize)}
              </MagneticButton>
            ) : (
              <MagneticButton
                type="button"
                onClick={() => scrollToHash('#order')}
                disabled={stockInfo !== null && !stockInfo.inStock}
                innerClassName={clsx(
                  'rounded-full px-8 py-3 font-mono text-xs font-medium tracking-[0.24em] uppercase transition-colors',
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
        <span className="tape inline-block">04 · configure</span>
        <h2
          className="display-headline text-bone-50"
          style={{ fontSize: 'clamp(2rem, 9vw, 3.5rem)' }}
        >
          Build yours,
          <br />
          <span className="spray-text text-ember-500">step by step.</span>
        </h2>
        <StepRail step={step} />
        {step >= FIRST_EDIT_STEP && step <= LAST_EDIT_STEP && (
          <SkateSwitcher />
        )}
        {step === PACKAGE_STEP && (
          <PackageHero
            onPick={() => {
              setActiveSkateIndex(0);
              setStep(FIRST_EDIT_STEP);
            }}
          />
        )}
        {step >= FIRST_EDIT_STEP && step <= LAST_EDIT_STEP && (
          <WizardCard
            step={(step - 1) as EditStepIndex}
            product={product}
            selection={selection}
            onDeck={setDeck}
            onWheel={setWheel}
            onTruck={setTruck}
            onGrip={setGrip}
            loading={loading}
            error={error}
            activeSkateIndex={activeSkateIndex}
            packageSize={packageSize}
          />
        )}
        {step === REVIEW_STEP && (
          <ReviewCard
            product={product}
            selections={selections}
            packageSize={packageSize}
            totalEGP={totalEGP}
            savingsEGP={savingsEGP}
            stockInfo={stockInfo}
            breakdown={breakdown}
          />
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === PACKAGE_STEP}
            className="rounded-full border border-bone-50/15 px-5 py-2 font-mono text-xs tracking-[0.24em] text-bone-100 uppercase disabled:opacity-30"
          >
            ← Back
          </button>
          {step < REVIEW_STEP ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-full bg-ember-500 px-6 py-2 font-mono text-xs tracking-[0.24em] text-ink-950 uppercase"
            >
              {nextLabel(step, activeSkateIndex, packageSize)}
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

interface StepRailProps {
  step: WizardStep;
  onJump?: (step: WizardStep) => void;
  /** Where the label + chips align. Defaults to 'end' for the original
      top-right placement; we use 'start' when the rail moves under the
      heading copy on the left column. */
  align?: 'start' | 'end';
}

// REVIEW_STEP is already declared near the top of the module (line 69)
// — the duplicate that used to live here was a stale 5-step leftover
// and Turbopack rejected the second declaration.
const EDIT_STEP_INDICES: readonly EditStepIndex[] = [0, 1, 2, 3, 4];

function StepRail({ step, onJump, align = 'end' }: StepRailProps) {
  let label = '';
  if (step === PACKAGE_STEP) {
    label = 'Step 01 / 07 · Package';
  } else if (step >= FIRST_EDIT_STEP && step <= LAST_EDIT_STEP) {
    const editIdx = (step - 1) as EditStepIndex;
    label = `Step ${String(step + 1).padStart(2, '0')} / 07 · ${STEPS[editIdx]!.axis}`;
  } else {
    label = 'Review · build complete';
  }

  const onKey = (e: React.KeyboardEvent, target: WizardStep) => {
    if (!onJump) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onJump(Math.min(REVIEW_STEP, target + 1) as WizardStep);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onJump(Math.max(PACKAGE_STEP, target - 1) as WizardStep);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onJump(PACKAGE_STEP);
    } else if (e.key === 'End') {
      e.preventDefault();
      onJump(REVIEW_STEP);
    }
  };

  const Dot = ({ state }: { state: 'done' | 'current' | 'idle' }) => (
    <span
      aria-hidden
      className={clsx(
        'block h-2 w-2 rounded-full transition-colors',
        state === 'done' && 'bg-ember-500',
        state === 'current' && 'bg-ember-400 ring-2 ring-ember-500/40',
        state === 'idle' && 'bg-bone-50/15',
      )}
    />
  );

  return (
    <div
      className={clsx(
        'flex flex-col gap-3',
        align === 'end' ? 'items-start md:items-end' : 'items-start',
      )}
    >
      <p className="font-mono text-[11px] tracking-[0.32em] text-bone-200 uppercase">
        {label}
      </p>
      <div
        role={onJump ? 'tablist' : undefined}
        aria-label={onJump ? 'Configure steps' : undefined}
        className="flex items-center gap-1.5"
      >
        {/* Package phase dot */}
        {onJump ? (
          <button
            type="button"
            role="tab"
            aria-selected={step === PACKAGE_STEP}
            aria-label="Pick package"
            tabIndex={step === PACKAGE_STEP ? 0 : -1}
            data-cursor="link"
            onClick={() => onJump(PACKAGE_STEP)}
            onKeyDown={(e) => onKey(e, PACKAGE_STEP)}
            className="mr-2 flex h-8 w-8 items-center justify-center rounded-full focus-visible:bg-bone-50/5"
          >
            <Dot
              state={
                step > PACKAGE_STEP
                  ? 'done'
                  : step === PACKAGE_STEP
                    ? 'current'
                    : 'idle'
              }
            />
          </button>
        ) : (
          <span className="mr-2">
            <Dot
              state={
                step > PACKAGE_STEP
                  ? 'done'
                  : step === PACKAGE_STEP
                    ? 'current'
                    : 'idle'
              }
            />
          </span>
        )}

        {/* 5 per-board edit bars */}
        {EDIT_STEP_INDICES.map((i) => {
          const targetStep = (i + 1) as WizardStep;
          const state: 'done' | 'current' | 'idle' =
            step > targetStep ? 'done' : step === targetStep ? 'current' : 'idle';
          const isInfo = STEPS[i]!.kind === 'info';
          const bar = (
            <span
              aria-hidden
              className={clsx(
                'block h-1 w-7 rounded-full transition-colors',
                state === 'done' && (isInfo ? 'bg-bone-200/70' : 'bg-ember-500'),
                state === 'current' &&
                  (isInfo ? 'bg-bone-100/80' : 'bg-ember-400/85'),
                state === 'idle' && 'bg-bone-50/10',
              )}
            />
          );
          if (!onJump) {
            return <span key={i}>{bar}</span>;
          }
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={step === targetStep}
              aria-label={`Step ${i + 1} of 5: ${STEPS[i]!.axis}`}
              tabIndex={step === targetStep ? 0 : -1}
              data-cursor="link"
              onClick={() => onJump(targetStep)}
              onKeyDown={(e) => onKey(e, targetStep)}
              className="flex h-8 w-9 items-center justify-center rounded-full focus-visible:bg-bone-50/5"
            >
              {bar}
            </button>
          );
        })}

        {/* Review tail dot */}
        {onJump ? (
          <button
            type="button"
            role="tab"
            aria-selected={step === REVIEW_STEP}
            aria-label="Review final build"
            tabIndex={step === REVIEW_STEP ? 0 : -1}
            data-cursor="link"
            onClick={() => onJump(REVIEW_STEP)}
            onKeyDown={(e) => onKey(e, REVIEW_STEP)}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full focus-visible:bg-bone-50/5"
          >
            <Dot state={step === REVIEW_STEP ? 'current' : 'idle'} />
          </button>
        ) : (
          <span className="ml-2">
            <Dot state={step === REVIEW_STEP ? 'current' : 'idle'} />
          </span>
        )}
      </div>
    </div>
  );
}

function footerHint(
  step: WizardStep,
  activeSkateIndex: number,
  packageSize: number,
): string {
  if (step === PACKAGE_STEP) return 'Pick a package to start customizing';
  if (step === REVIEW_STEP) return 'Final build · ready to ship';
  const def = STEPS[(step - 1) as EditStepIndex];
  const boardSuffix =
    packageSize > 1
      ? ` · Board ${activeSkateIndex + 1}/${packageSize}`
      : '';
  if (def?.kind === 'info') return `Stock part — Click Next${boardSuffix}`;
  return `Click Next to lock in this axis${boardSuffix}`;
}

function nextLabel(
  step: WizardStep,
  activeSkateIndex: number,
  packageSize: number,
): string {
  if (step === PACKAGE_STEP) return 'Start building →';
  if (step === LAST_EDIT_STEP && activeSkateIndex < packageSize - 1) {
    return `Board ${activeSkateIndex + 2} →`;
  }
  if (step === LAST_EDIT_STEP) return 'Review →';
  return 'Next →';
}

interface WizardCardProps {
  step: EditStepIndex;
  product: Product | null;
  selection: ConfigurationSelection;
  onDeck: (v: DeckGraphic) => void;
  onWheel: (v: WheelColor) => void;
  onTruck: (v: TruckColor) => void;
  onGrip: (v: GripPattern) => void;
  loading: boolean;
  error: string | null;
  activeSkateIndex: number;
  packageSize: number;
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
  activeSkateIndex,
  packageSize,
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
      // #29: explicit card spec, soft white wash + hairline border + 24 px padding.
      className="halftone-corner rounded-2xl"
      style={{
        background: 'rgba(245, 245, 240, 0.04)',
        border: '1px solid rgba(245, 245, 240, 0.08)',
        padding: '24px',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.32em] text-ember-400 uppercase">
          {def.axis}
        </p>
        {packageSize > 1 && (
          <p className="font-mono text-[10px] tracking-[0.22em] text-bone-50/50 uppercase">
            Board {activeSkateIndex + 1} / {packageSize}
          </p>
        )}
      </div>
      <p
        className="mt-2 max-w-md font-sans text-sm text-bone-50"
        style={{ lineHeight: 'var(--leading-body)' }}
      >
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
        {step === 2 && <BearingsInfoPanel />}
        {step === 3 && (
          <SwatchRow<TruckColor>
            axis="Trucks"
            options={product.options.truck}
            value={selection.truck}
            onChange={onTruck}
          />
        )}
        {step === 4 && (
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

/**
 * Bearings step body. No selection - every board ships with the same
 * sealed ABEC-7 set, so the panel renders a 4-row spec table instead of
 * a SwatchRow. Visual consistency with the other steps is preserved by
 * using the same card shell + axis kicker (handled by WizardCard).
 */
function BearingsInfoPanel() {
  const specs: { label: string; value: string }[] = [
    { label: 'Rating', value: 'ABEC-7' },
    { label: 'Material', value: 'Hardened steel' },
    { label: 'Seal', value: 'Sealed, pre-lubed' },
    { label: 'Per board', value: '8 (2 per wheel)' },
  ];
  return (
    <dl className="divide-y divide-bone-50/10 rounded-xl border border-bone-50/10 bg-white/[0.02]">
      {specs.map((s) => (
        <div
          key={s.label}
          className="flex items-baseline justify-between gap-4 px-3 py-2.5"
        >
          <dt className="font-mono text-[10px] tracking-[0.24em] text-bone-300 uppercase">
            {s.label}
          </dt>
          <dd className="font-mono text-xs tracking-wider text-bone-50">
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface ReviewCardProps {
  product: Product | null;
  selections: ConfigurationSelection[];
  packageSize: number;
  totalEGP: number | null;
  savingsEGP: number;
  stockInfo: VariantStockInfo | null;
  breakdown: PriceBreakdownRow[];
}

function ReviewCard({
  product,
  selections,
  packageSize,
  totalEGP,
  savingsEGP,
  stockInfo,
  breakdown,
}: ReviewCardProps) {
  const formatEGP = (egp: number) =>
    new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(egp);
  // We surface the active board's breakdown plus a list of every board's
  // selection so the user can confirm they configured each one. breakdown
  // is computed against the active board upstream.
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
      className="halftone-corner rounded-2xl"
      style={{
        background: 'rgba(245, 245, 240, 0.04)',
        border: '1px solid rgba(245, 245, 240, 0.08)',
        padding: '20px',
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.32em] text-ember-400 uppercase">
          Your build · review
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
            {stockInfo.inStock
              ? `In stock · ${stockInfo.stock}`
              : 'Out of stock'}
          </span>
        )}
      </div>

      <p className="mt-1 font-mono text-[10px] tracking-[0.22em] text-bone-50/55 uppercase">
        {packageSize}-board package
        {savingsEGP > 0 && (
          <span className="ml-2 text-ember-300">
            · saved {formatEGP(savingsEGP)}
          </span>
        )}
      </p>

      <div className="mt-4 flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
        {selections.map((sel, i) => {
          const sku = product ? skuFromSelection(product.slug, sel) : '';
          return (
            <div
              key={i}
              className="rounded-lg border border-bone-50/10 bg-white/[0.02] p-2.5"
            >
              <p className="font-mono text-[10px] tracking-[0.22em] text-bone-50/55 uppercase">
                Board {i + 1}
              </p>
              <p className="mt-1 font-mono text-[11px] tracking-wider text-bone-50 uppercase">
                {sel.deck} · {sel.wheel} · {sel.truck} · {sel.grip}
              </p>
              {sku && (
                <p
                  className="mt-1 font-mono text-[9px] tracking-wider text-bone-50/40"
                  style={{ wordBreak: 'break-all' }}
                  title={sku}
                >
                  {sku}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <dl className="mt-4 divide-y divide-bone-50/10 border-y border-bone-50/10">
        {breakdown.map((row) => (
          <div
            key={row.axis}
            className="flex items-center justify-between gap-4 py-1.5 font-mono text-xs text-bone-100"
          >
            <dt className="text-[10px] tracking-[0.24em] text-bone-300 uppercase">
              {row.axis}
            </dt>
            <dd className="text-right">
              <span>{row.variant}</span>
              <span
                className={clsx(
                  'ml-2 text-[11px]',
                  row.amount > 0 ? 'text-ember-400' : 'text-bone-500/70',
                )}
              >
                {row.amount > 0 ? `+${row.amount} EGP` : 'incl.'}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
          Total
        </span>
        <span
          className="font-display text-bone-50"
          style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)', lineHeight: 0.9 }}
        >
          {totalEGP !== null ? formatEGP(totalEGP) : '—'}
        </span>
      </div>
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
