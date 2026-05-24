'use client';

/**
 * StreetSprite, hand-drawn skate-poster stickers scattered around the
 * page. Pure SVG so they scale crisply, framer-motion for hover
 * micro-interactions, and `pointer-events-auto` only inside the icon
 * itself (the absolute-positioned wrapper consumers add lives in dead
 * space).
 *
 * Eleven shapes that read as a skate / screen-print vocabulary:
 *   bolt   — lightning bolt
 *   star   — 4-pointed sparkle star
 *   x      — sharpie X
 *   arrow  — sketched wavy arrow
 *   ring   — outlined circle
 *   tri    — solid triangle
 *   wave   — squiggle
 *   spark  — radial sun-burst
 *   tag    — checkmark/swoosh
 *   skull  — minimal skate-deck skull
 *   dots   — halftone cluster
 *
 * Six hover behaviours:
 *   wiggle, spin, pulse, pop, jitter, none
 *
 * Three color modes:
 *   ember (brand accent), bone (off-white), mute (very subtle)
 *
 * Sizes default to px; consumers pass any number.
 */
import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export type SpriteKind =
  | 'bolt'
  | 'star'
  | 'x'
  | 'arrow'
  | 'ring'
  | 'tri'
  | 'wave'
  | 'spark'
  | 'tag'
  | 'skull'
  | 'dots';

interface SpriteDef {
  viewBox: string;
  paths: ReactNode;
}

const SPRITES: Record<SpriteKind, SpriteDef> = {
  bolt: {
    viewBox: '0 0 24 32',
    paths: (
      <path
        d="M14 0 L4 18 L10 18 L7 32 L20 12 L13 12 L17 0 Z"
        fill="currentColor"
      />
    ),
  },
  star: {
    viewBox: '0 0 24 24',
    paths: (
      <polygon
        points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10"
        fill="currentColor"
      />
    ),
  },
  x: {
    viewBox: '0 0 24 24',
    paths: (
      <>
        <line
          x1="4"
          y1="4"
          x2="20"
          y2="20"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="4"
          x2="4"
          y2="20"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </>
    ),
  },
  arrow: {
    viewBox: '0 0 36 24',
    paths: (
      <>
        <path
          d="M2 12 Q9 4, 16 12 T30 12"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <polyline
          points="24,5 32,12 24,19"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  ring: {
    viewBox: '0 0 24 24',
    paths: (
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
      />
    ),
  },
  tri: {
    viewBox: '0 0 24 24',
    paths: <polygon points="12,3 22,20 2,20" fill="currentColor" />,
  },
  wave: {
    viewBox: '0 0 48 12',
    paths: (
      <path
        d="M2 6 Q7 1, 12 6 T22 6 T32 6 T46 6"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    ),
  },
  spark: {
    viewBox: '0 0 28 28',
    paths: (
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      >
        <line x1="14" y1="3" x2="14" y2="9" />
        <line x1="14" y1="19" x2="14" y2="25" />
        <line x1="3" y1="14" x2="9" y2="14" />
        <line x1="19" y1="14" x2="25" y2="14" />
        <line x1="6" y1="6" x2="10" y2="10" />
        <line x1="18" y1="18" x2="22" y2="22" />
        <line x1="6" y1="22" x2="10" y2="18" />
        <line x1="18" y1="10" x2="22" y2="6" />
      </g>
    ),
  },
  tag: {
    viewBox: '0 0 28 24',
    paths: (
      <path
        d="M3 12 L9 19 L25 4"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  skull: {
    viewBox: '0 0 28 28',
    paths: (
      <g fill="currentColor">
        <path d="M14 3 C20 3, 24 7, 24 13 L24 17 L21 19 L21 23 L17 23 L17 19 L11 19 L11 23 L7 23 L7 19 L4 17 L4 13 C4 7, 8 3, 14 3 Z" />
        <circle cx="10" cy="13" r="2" fill="#07070a" />
        <circle cx="18" cy="13" r="2" fill="#07070a" />
      </g>
    ),
  },
  dots: {
    viewBox: '0 0 32 32',
    paths: (
      <g fill="currentColor">
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 4 }).map((__, col) => (
            <circle
              key={`${row}-${col}`}
              cx={4 + col * 8}
              cy={4 + row * 8}
              r={1.6}
            />
          )),
        )}
      </g>
    ),
  },
};

type ColorMode = 'ember' | 'bone' | 'mute';
const COLOR_CLASSES: Record<ColorMode, string> = {
  ember: 'text-ember-500/55',
  bone: 'text-bone-50/35',
  mute: 'text-bone-50/15',
};

type HoverKind = 'wiggle' | 'spin' | 'pulse' | 'pop' | 'jitter' | 'none';

interface Props {
  kind: SpriteKind;
  /** Pixel size. Width = height (square box). */
  size?: number;
  color?: ColorMode;
  /** Initial rotation in degrees (visual punctuation). */
  rotate?: number;
  hover?: HoverKind;
  className?: string;
  style?: CSSProperties;
}

export function StreetSprite({
  kind,
  size = 32,
  color = 'ember',
  rotate = 0,
  hover = 'wiggle',
  className,
  style,
}: Props) {
  const sprite = SPRITES[kind];

  // Per-hover animation. framer-motion's `whileHover` cancels cleanly
  // when the mouse leaves, so these never "stick".
  const hoverAnim =
    hover === 'wiggle'
      ? { rotate: [rotate, rotate - 12, rotate + 9, rotate - 6, rotate + 3, rotate] }
      : hover === 'spin'
        ? { rotate: rotate + 360 }
        : hover === 'pulse'
          ? { scale: [1, 1.25, 1] }
          : hover === 'pop'
            ? { scale: 1.35 }
            : hover === 'jitter'
              ? { x: [0, -2, 3, -2, 1, 0], y: [0, 1, -2, 2, -1, 0] }
              : {};

  const transition =
    hover === 'wiggle'
      ? { duration: 0.6, ease: 'easeInOut' as const }
      : hover === 'spin'
        ? { duration: 0.9, ease: 'easeInOut' as const }
        : hover === 'pulse'
          ? { duration: 0.55, ease: 'easeInOut' as const }
          : hover === 'pop'
            ? { type: 'spring' as const, stiffness: 420, damping: 14 }
            : hover === 'jitter'
              ? { duration: 0.4 }
              : { duration: 0.3 };

  return (
    <motion.span
      aria-hidden
      className={clsx(
        'pointer-events-auto inline-flex select-none',
        COLOR_CLASSES[color],
        className,
      )}
      style={{
        width: size,
        height: size,
        ...style,
      }}
      initial={{ rotate }}
      animate={{ rotate }}
      whileHover={hoverAnim}
      transition={transition}
    >
      <svg
        viewBox={sprite.viewBox}
        fill="none"
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      >
        {sprite.paths}
      </svg>
    </motion.span>
  );
}
