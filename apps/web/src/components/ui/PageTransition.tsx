'use client';

/**
 * PageTransition — full-bleed curtain wipe used between route transitions.
 *
 * The persistent WebGL canvas must keep rendering during the transition; we
 * fade a near-black curtain over the DOM and canvas, then back out once the
 * new route is mounted.
 */
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const curtainVariants: Variants = {
  initial: { y: '100%' },
  enter: {
    y: '0%',
    transition: { duration: 0.55, ease: [0.65, 0, 0.35, 1] },
  },
  exit: {
    y: '-100%',
    transition: { duration: 0.55, ease: [0.65, 0, 0.35, 1] },
  },
};

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={pathname} className="page-root">
          {children}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div
          key={`curtain-${pathname}`}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[80] bg-ink-950"
          variants={curtainVariants}
          initial="initial"
          animate="exit"
          exit="enter"
        />
      </AnimatePresence>
    </>
  );
}
