'use client';

/**
 * PackageHero, the first configurator step.
 *
 * Choreography:
 *   1. Skate backdrop slides DOWN from above into the column (~0.7s).
 *   2. Cards fade in one-by-one (stagger 0.18s, starts after the skate
 *      lands).
 *   3. When the user clicks a card:
 *        a. The other two cards fade out FAST (~0.18s).
 *        b. The picked card fades out SLOW (~0.55s) after a tiny pause.
 *        c. The skate slides DOWN out of the column.
 *        d. onPick is called, parent advances the wizard.
 *   4. If the user clicks BACK to return, the whole sequence replays
 *      because PackageHero remounts.
 *
 * The big 3D deck is static (no rotation) and rendered top-down so it
 * reads as a stage under the cards.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  PACKAGE_OFFERS,
  packageSavingsEGP,
  type PackageOffer,
  type PackageSize,
} from '@pocketdeck/types';
import { useSceneStore } from '@/store/scene';
import { BigDeckBackdrop } from './BigDeckBackdrop';
import { MiniSkateScene } from './MiniSkateScene';

const FORMAT_EGP = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
  maximumFractionDigits: 0,
});

// Choreography timing. Bumped up across the board because the previous
// values felt rushed - the user wants every beat (skate landing, cards
// settling, picked card lingering, skate leaving) to read as a deliberate
// moment, not a blink.
const SKATE_ENTER_MS = 1100;
const CARD_STAGGER_MS = 280;
const CARDS_LANDING_DELAY = 0.85; // seconds before first card appears
const OTHER_EXIT_MS = 280;
const PICKED_EXIT_MS = 950;
const SKATE_EXIT_MS = 900;

function CornerAccents({ active }: { active: boolean }) {
  const stroke = active ? 'text-ember-500' : 'text-bone-50/30';
  const corners = [
    'top-0 left-0',
    'top-0 right-0 rotate-90',
    'bottom-0 right-0 rotate-180',
    'bottom-0 left-0 -rotate-90',
  ] as const;
  return (
    <>
      {corners.map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={clsx(
            'pointer-events-none absolute h-5 w-5 transition-colors',
            stroke,
            pos,
          )}
        >
          <span className="absolute top-0 left-0 h-[2px] w-5 bg-current" />
          <span className="absolute top-0 left-0 h-5 w-[2px] bg-current" />
        </span>
      ))}
    </>
  );
}

interface CardProps {
  offer: PackageOffer;
  active: boolean;
  index: number;
  pickingSize: PackageSize | null;
  onPick: (size: PackageSize) => void;
}

function PackageCard({
  offer,
  active,
  index,
  pickingSize,
  onPick,
}: CardProps) {
  const [hovered, setHovered] = useState(false);
  const savings = packageSavingsEGP(offer.size);

  // Resolve which animate state this card is in:
  //   idle           → no pick in progress, normal display
  //   pickedExit     → this card was just chosen, fade out slowly
  //   otherExit      → another card was chosen, fade out fast
  const animateState =
    pickingSize === null
      ? 'visible'
      : pickingSize === offer.size
        ? 'pickedExit'
        : 'otherExit';

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 28 },
        visible: { opacity: 1, y: 0 },
        otherExit: {
          opacity: 0,
          y: -18,
          transition: { duration: OTHER_EXIT_MS / 1000, ease: 'easeIn' },
        },
        pickedExit: {
          opacity: 0,
          y: -10,
          scale: 0.96,
          transition: {
            duration: PICKED_EXIT_MS / 1000,
            // Linger after the others vanish before starting to fade -
            // gives the user a clean "this is the one I picked" beat.
            delay: 0.32,
            ease: [0.65, 0, 0.35, 1],
          },
        },
      }}
      animate={animateState}
      transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => {
        if (pickingSize !== null) return; // Lock further clicks while exiting
        onPick(offer.size);
      }}
      onKeyDown={(e) => {
        if (pickingSize !== null) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(offer.size);
        }
      }}
      role="button"
      tabIndex={pickingSize === null ? 0 : -1}
      aria-pressed={active}
      data-cursor="link"
      className={clsx(
        'group relative flex min-h-0 flex-1 cursor-pointer flex-col overflow-hidden border-2 backdrop-blur-sm transition-colors duration-300',
        active
          ? 'border-ember-500 bg-ember-500/[0.10] shadow-[0_22px_55px_-18px_rgba(255,91,20,0.45)]'
          : hovered
            ? 'border-bone-50/55 bg-ink-950/55'
            : 'border-bone-50/15 bg-ink-950/40 hover:border-bone-50/40',
      )}
      // Custom prop for the variants resolver (allows transition delay
      // to differ per role).
      custom={{ index, isPicked: animateState === 'pickedExit' }}
    >
      <CornerAccents active={active || hovered} />

      {/* SAVE pill, top-right. */}
      {savings > 0 && (
        <span className="absolute top-3 right-3 z-20 inline-flex items-baseline gap-1 bg-ember-500 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.18em] text-ink-950 uppercase shadow-[0_8px_24px_-6px_rgba(255,91,20,0.55)]">
          Save {FORMAT_EGP.format(savings)}
        </span>
      )}

      {/* Top row: kicker + label */}
      <div className="relative z-10 flex shrink-0 items-baseline gap-3 px-4 pt-3">
        <span className="font-mono text-[10px] tracking-[0.28em] text-ember-400 uppercase">
          Pack {String(offer.size).padStart(2, '0')}
        </span>
        <span className="font-display text-xl tracking-tight text-bone-50 uppercase">
          {offer.label}
        </span>
      </div>

      {/* Middle: big numeral + hover mini 3D scene */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center px-4">
        <div
          className={clsx(
            'flex items-baseline gap-3 transition-opacity duration-300',
            hovered && pickingSize === null ? 'opacity-0' : 'opacity-100',
          )}
        >
          <span
            className="font-display leading-none text-bone-50"
            style={{
              fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
              letterSpacing: '-0.04em',
            }}
          >
            {offer.size}
          </span>
          <span className="font-mono text-[11px] tracking-[0.32em] text-bone-200/60 uppercase">
            board{offer.size > 1 ? 's' : ''}
          </span>
        </div>

        {/* Mini 3D scene: ONLY mounted while hovered (saves GPU on
            idle cards). 1/2/3 mini boards depending on the pack size,
            with their own self-contained lighting. Positioned in the
            UPPER 60% of the middle area so the CHOOSE pill (anchored
            at the bottom) doesn't sit on top of the boards. */}
        {hovered && pickingSize === null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.25, ease: [0.65, 0, 0.35, 1] }}
            className="pointer-events-none absolute top-0 right-0 left-0 bottom-[40%]"
          >
            <MiniSkateScene count={offer.size} hovered />
          </motion.div>
        )}

        {/* CHOOSE pill, hover-only - sits in the LOWER portion of the
            middle area so it never covers the mini scene above. */}
        <div
          className={clsx(
            'pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-[35%] items-center justify-center transition-all duration-300',
            hovered && pickingSize === null
              ? 'translate-y-0 opacity-100'
              : 'translate-y-3 opacity-0',
          )}
        >
          <span
            className={clsx(
              'inline-flex items-center gap-2 px-5 py-2.5 font-mono text-[11px] font-bold tracking-[0.32em] uppercase shadow-[0_18px_45px_-12px_rgba(255,91,20,0.55)]',
              active
                ? 'bg-ember-500 text-ink-950'
                : 'bg-bone-50 text-ink-950',
            )}
          >
            {active ? 'Selected ✓' : 'Choose'}
            <span aria-hidden>→</span>
          </span>
        </div>
        {/* Active chip when idle */}
        {active && !hovered && pickingSize === null && (
          <span
            aria-hidden
            className="absolute right-4 bottom-3 inline-flex items-center gap-1.5 bg-ember-500/15 px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.22em] text-ember-300 uppercase ring-1 ring-ember-500/40"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
            On deck
          </span>
        )}
      </div>

      {/* Bottom: vibe + price */}
      <div className="relative z-10 flex shrink-0 items-end justify-between gap-4 border-t border-bone-50/10 bg-ink-950/55 px-4 py-2.5 backdrop-blur">
        <p className="text-[11px] text-bone-200/80">{offer.vibe}</p>
        <div className="text-right">
          <span className="font-display text-xl tracking-tight text-bone-50">
            {FORMAT_EGP.format(offer.basePriceEGP)}
          </span>
          <p className="font-mono text-[9px] tracking-[0.18em] text-bone-200/60 uppercase">
            + upgrades
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function PackageHero({
  onPick,
}: {
  onPick: (size: PackageSize) => void;
}) {
  const activeSize = useSceneStore((s) => s.packageSize);
  const setPackageSize = useSceneStore((s) => s.setPackageSize);

  // Orchestration state for the click → exit sequence.
  const [pickingSize, setPickingSize] = useState<PackageSize | null>(null);
  const [hidingSkate, setHidingSkate] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clean up pending timers if the component unmounts mid-sequence.
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const handlePick = (size: PackageSize) => {
    if (pickingSize !== null) return; // Single-shot
    setPackageSize(size);
    setPickingSize(size);

    // After the picked card finishes its slow fade-out, hide the skate.
    // Card exit budget = pickedExit delay (320ms) + duration (950ms).
    const cardsDone = 320 + PICKED_EXIT_MS + 80;
    timersRef.current.push(
      setTimeout(() => setHidingSkate(true), cardsDone),
    );

    // After the skate finishes its slide-down, advance the wizard.
    const skateDone = cardsDone + SKATE_EXIT_MS + 120;
    timersRef.current.push(
      setTimeout(() => onPick(size), skateDone),
    );
  };

  return (
    <motion.div
      key="package-cards"
      // Render container has no entrance/exit of its own - the parent's
      // AnimatePresence in ConfiguratorSection skips animating us, so we
      // can run our own internal choreography end-to-end.
      // overflow-hidden clips the skate backdrop while it slides in/out
      // so the off-screen position (y: ±110%) can't push a scrollbar
      // onto the surrounding stage.
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.001 } }}
      className="relative h-full w-full overflow-hidden"
    >
      {/* Backdrop layer. Slides in from above on mount; slides out
          downward when hidingSkate flips on. */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        initial={{ y: '-110%' }}
        animate={{ y: hidingSkate ? '110%' : 0 }}
        transition={{
          duration: hidingSkate ? SKATE_EXIT_MS / 1000 : SKATE_ENTER_MS / 1000,
          ease: [0.65, 0, 0.35, 1],
        }}
      >
        <BigDeckBackdrop />
      </motion.div>

      {/* Ember radial halo glued to the backdrop's motion. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        initial={{ y: '-110%', opacity: 0 }}
        animate={{
          y: hidingSkate ? '110%' : 0,
          opacity: hidingSkate ? 0 : 1,
        }}
        transition={{
          duration: hidingSkate ? SKATE_EXIT_MS / 1000 : SKATE_ENTER_MS / 1000,
          ease: [0.65, 0, 0.35, 1],
        }}
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,91,20,0.16) 0%, rgba(255,91,20,0) 55%)',
        }}
      />

      {/* Cards layer. Stagger children with delayChildren so the first
          card waits for the skate to land before fading in. */}
      <motion.div
        className="relative z-10 flex h-full flex-col gap-3 p-2"
        initial="hidden"
        animate={pickingSize === null ? 'visible' : 'visible-static'}
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: CARD_STAGGER_MS / 1000,
              delayChildren: CARDS_LANDING_DELAY,
            },
          },
          // Once a pick is in progress we stop staggering (so the per-
          // card exit variants run together, not in series).
          'visible-static': { transition: {} },
        }}
      >
        {PACKAGE_OFFERS.map((offer, i) => (
          <PackageCard
            key={offer.size}
            offer={offer}
            active={activeSize === offer.size}
            index={i}
            pickingSize={pickingSize}
            onPick={handlePick}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
