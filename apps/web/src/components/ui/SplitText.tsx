'use client';

/**
 * SplitText, splits children (a string) into per-word or per-char spans and
 * staggers them in with Framer Motion. Triggers in-view via the intersection
 * observer baked into `whileInView`.
 */
import { motion, type Variants } from 'framer-motion';
import clsx from 'clsx';
import { useMemo } from 'react';

interface SplitTextProps {
  children: string;
  /** Split granularity. */
  by?: 'word' | 'char';
  /** Per-item stagger seconds. */
  stagger?: number;
  /** Animation delay. */
  delay?: number;
  /** Container className. */
  className?: string;
  /** Per-item className. */
  itemClassName?: string;
  /** If true, replays the reveal each time the element re-enters view. */
  once?: boolean;
  /**
   * Gate the reveal. When `false` the text stays in its `hidden` initial
   * state and ignores in-view; when `true` it animates in (still respects
   * `viewport` — i.e. won't animate until visible). Defaults to `true` so
   * existing callers keep the original behaviour.
   */
  play?: boolean;
}

const containerVariants: Variants = {
  hidden: {},
  visible: (custom: { stagger: number; delay: number }) => ({
    transition: {
      staggerChildren: custom.stagger,
      delayChildren: custom.delay,
    },
  }),
};

const itemVariants: Variants = {
  hidden: { y: '110%', opacity: 0 },
  visible: {
    y: '0%',
    opacity: 1,
    transition: { duration: 0.85, ease: [0.65, 0, 0.35, 1] },
  },
};

export function SplitText({
  children,
  by = 'word',
  stagger = 0.06,
  delay = 0,
  className,
  itemClassName,
  once = true,
  play = true,
}: SplitTextProps) {
  const pieces = useMemo(() => {
    if (by === 'word') {
      return children.split(/(\s+)/).map((part) => ({
        text: part,
        whitespace: /^\s+$/.test(part),
      }));
    }
    return Array.from(children).map((c) => ({
      text: c,
      whitespace: /\s/.test(c),
    }));
  }, [children, by]);

  // When `play` is false, force `animate="hidden"` so words stay clipped
  // until the gate flips — Framer Motion will then transition them into
  // the variants-driven visible state. When `play` is true we fall back
  // to the original `whileInView` so the reveal still respects viewport
  // for any future off-screen usage.
  const motionTrigger = play
    ? { whileInView: 'visible' as const }
    : { animate: 'hidden' as const };

  return (
    <motion.span
      className={clsx('inline-block', className)}
      initial="hidden"
      {...motionTrigger}
      viewport={{ once, amount: 0.3 }}
      variants={containerVariants}
      custom={{ stagger, delay }}
    >
      {pieces.map((p, i) =>
        p.whitespace ? (
          <span key={`ws-${i}`} aria-hidden>
            {p.text}
          </span>
        ) : (
          <span
            key={`w-${i}`}
            className={clsx('inline-block overflow-hidden align-bottom')}
          >
            <motion.span
              variants={itemVariants}
              className={clsx('inline-block will-change-transform', itemClassName)}
            >
              {p.text}
            </motion.span>
          </span>
        ),
      )}
    </motion.span>
  );
}
