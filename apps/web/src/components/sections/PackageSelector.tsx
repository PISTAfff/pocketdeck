'use client';

/**
 * PackageSelector, the first wizard step.
 *
 * Three cards (Solo / Duo / Crew) with mini-board silhouettes that
 * animate on hover - the boards "fan out" and gain depth so the user
 * physically sees what 1 / 2 / 3 boards looks like. Each card also
 * surfaces the EGP savings vs buying the boards solo.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  PACKAGE_OFFERS,
  packageSavingsEGP,
  type PackageSize,
} from '@pocketdeck/types';
import { useSceneStore } from '@/store/scene';

/**
 * Per-card preview - a stack of mini board silhouettes that animate
 * into a fanned/wider arrangement on hover. We hand-roll the
 * silhouette as an SVG (curved rectangle + 4 wheels) so it tracks the
 * brand's procedural deck look without dragging in three.js.
 */
function MiniBoard({
  className,
  active,
  hue,
}: {
  className?: string;
  active: boolean;
  hue: string;
}) {
  return (
    <svg
      viewBox="0 0 80 26"
      className={className}
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`mini-grad-${hue}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hue} stopOpacity={active ? 0.92 : 0.7} />
          <stop offset="100%" stopColor={hue} stopOpacity={active ? 0.6 : 0.4} />
        </linearGradient>
      </defs>
      {/* Deck silhouette - curves up at both ends like a real board */}
      <path
        d="M 4 14 C 8 4, 24 4, 40 4 C 56 4, 72 4, 76 14 L 76 18 C 72 22, 56 22, 40 22 C 24 22, 8 22, 4 18 Z"
        fill={`url(#mini-grad-${hue})`}
        stroke={hue}
        strokeOpacity={active ? 0.9 : 0.5}
        strokeWidth="0.6"
      />
      {/* Trucks + wheels */}
      <circle cx="18" cy="22" r="2" fill="#1a1a22" />
      <circle cx="18" cy="22" r="0.8" fill={hue} opacity={active ? 0.9 : 0.6} />
      <circle cx="62" cy="22" r="2" fill="#1a1a22" />
      <circle cx="62" cy="22" r="0.8" fill={hue} opacity={active ? 0.9 : 0.6} />
    </svg>
  );
}

/** Position deltas for each board in an N-board preview. */
const LAYOUTS: Record<PackageSize, { x: number; y: number; rot: number }[]> = {
  1: [{ x: 0, y: 0, rot: -4 }],
  2: [
    { x: -16, y: 4, rot: -8 },
    { x: 16, y: -4, rot: 6 },
  ],
  3: [
    { x: -24, y: 8, rot: -14 },
    { x: 0, y: -2, rot: 2 },
    { x: 24, y: 6, rot: 14 },
  ],
};

/** Per-board hue so the trio reads as three boards, not three clones. */
const HUES = ['#f5f5f0', '#ff5b14', '#ff7d3a'];

function PackagePreview({
  size,
  hovered,
  active,
}: {
  size: PackageSize;
  hovered: boolean;
  active: boolean;
}) {
  const layout = LAYOUTS[size];
  // Hover expands the spread and tilts more dramatically; idle pulls
  // everything into a tight stack so the card reads compact.
  const expand = hovered ? 1.45 : 1;
  return (
    <div className="relative h-20 w-full">
      {layout.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2"
          initial={false}
          animate={{
            x: pos.x * expand - 40,
            y: pos.y * expand - 10,
            rotate: pos.rot * (hovered ? 1.2 : 0.8),
            scale: hovered ? 1.1 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 220,
            damping: 22,
            mass: 0.6,
            delay: hovered ? i * 0.06 : (size - 1 - i) * 0.04,
          }}
          style={{ width: 80, transformOrigin: 'center' }}
        >
          <MiniBoard
            active={active || hovered}
            hue={HUES[i % HUES.length]!}
          />
        </motion.div>
      ))}
    </div>
  );
}

const FORMAT_EGP = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
  maximumFractionDigits: 0,
});

export function PackageSelector({
  onPicked,
}: {
  /** Called when the user picks a package (e.g. to advance the wizard). */
  onPicked?: (size: PackageSize) => void;
}) {
  const packageSize = useSceneStore((s) => s.packageSize);
  const setPackageSize = useSceneStore((s) => s.setPackageSize);
  const [hovered, setHovered] = useState<PackageSize | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
      className="halftone-corner rounded-2xl"
      style={{
        background: 'rgba(245, 245, 240, 0.04)',
        border: '1px solid rgba(245, 245, 240, 0.08)',
        padding: '20px',
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.32em] text-ember-400 uppercase">
          Package
        </p>
        <p className="font-mono text-[10px] tracking-[0.22em] text-bone-50/45 uppercase">
          Pick first
        </p>
      </div>
      <p
        className="mt-2 max-w-md font-sans text-sm text-bone-50"
        style={{ lineHeight: 'var(--leading-body)' }}
      >
        How many boards? Each gets its own custom build.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {PACKAGE_OFFERS.map((offer) => {
          const isActive = packageSize === offer.size;
          const isHovered = hovered === offer.size;
          const savings = packageSavingsEGP(offer.size);
          return (
            <button
              key={offer.size}
              type="button"
              onClick={() => {
                setPackageSize(offer.size);
                onPicked?.(offer.size);
              }}
              onMouseEnter={() => setHovered(offer.size)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(offer.size)}
              onBlur={() => setHovered(null)}
              aria-pressed={isActive}
              data-cursor="link"
              className={clsx(
                'group relative flex flex-col gap-2 overflow-hidden rounded-xl border p-3 text-left transition-all',
                isActive
                  ? 'border-ember-500/70 bg-ember-500/10 shadow-[0_0_0_1px_rgba(255,123,52,0.22),0_18px_45px_-18px_rgba(255,91,20,0.55)]'
                  : 'border-bone-50/10 bg-white/[0.02] hover:border-bone-50/30 hover:bg-white/[0.05]',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-bone-50">
                  {offer.label}
                </span>
                <span className="font-mono text-[10px] tracking-[0.18em] text-bone-50/60 uppercase">
                  {offer.size}×
                </span>
              </div>
              <span className="text-[10px] text-bone-50/55">{offer.vibe}</span>

              <PackagePreview
                size={offer.size}
                hovered={isHovered}
                active={isActive}
              />

              <div className="mt-1 flex flex-col">
                <span className="font-display text-xl leading-tight text-bone-50">
                  {FORMAT_EGP.format(offer.basePriceEGP)}
                </span>
                <span className="font-mono text-[9px] tracking-[0.18em] text-bone-50/50 uppercase">
                  + upgrades
                </span>
              </div>

              <AnimatePresence>
                {savings > 0 && (
                  <motion.span
                    key="saving"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="inline-flex w-fit items-center gap-1 rounded-full bg-ember-500/15 px-2 py-0.5 font-mono text-[9px] tracking-[0.2em] text-ember-300 uppercase"
                  >
                    Save {FORMAT_EGP.format(savings)}
                  </motion.span>
                )}
              </AnimatePresence>

              {isActive && (
                <span
                  aria-hidden
                  className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-ember-500 text-[8px] font-bold text-ink-950"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
