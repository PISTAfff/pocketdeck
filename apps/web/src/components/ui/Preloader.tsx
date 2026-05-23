'use client';

/**
 * Preloader, the first-paint reveal.
 *
 * The procedural 3D scene has no glTF / texture work yet, so Drei's
 * useProgress reports active=false and progress=100 almost immediately.
 * We layer two gates on top of that:
 *
 *   - a minimum display window (so the brand mark has a real beat to land,
 *     not a flash you can't catch)
 *   - a single stable RAF loop that interpolates the displayed counter
 *     toward the real progress value, instead of restarting on every
 *     React render
 *
 * After both gates are satisfied the overlay fades out and unmounts so it
 * never blocks pointer events.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useProgress } from '@react-three/drei';

const MIN_DISPLAY_MS = 1500;
const FADE_OUT_MS = 700;

export function Preloader() {
  const { progress, active } = useProgress();
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);
  const mountedAtRef = useRef<number>(Date.now());
  const progressRef = useRef(0);
  progressRef.current = progress;

  // Single RAF loop that lerps the displayed counter toward the live
  // progress, regardless of how often React re-renders.
  useEffect(() => {
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      setDisplay((prev) => {
        const target = progressRef.current;
        const next = prev + (target - prev) * 0.16;
        return Math.abs(target - next) < 0.4 ? target : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  // Gate dismissal on (a) Drei reports inactive, (b) minimum display window.
  useEffect(() => {
    if (active) return;
    const elapsed = Date.now() - mountedAtRef.current;
    const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const id = window.setTimeout(() => setDone(true), wait);
    return () => window.clearTimeout(id);
  }, [active]);

  const shown = Math.min(100, Math.round(display));

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="preloader"
          aria-hidden
          className="fixed inset-0 z-[100] flex items-end justify-between bg-ink-950 px-8 pb-10 md:px-16 md:pb-16"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: FADE_OUT_MS / 1000, ease: [0.65, 0, 0.35, 1] },
          }}
        >
          {/* Brand mark, top-left */}
          <div className="absolute top-8 left-8 md:top-12 md:left-16">
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                transition: { duration: 0.8, ease: [0.65, 0, 0.35, 1] },
              }}
              className="flex items-center gap-3"
            >
              <span className="h-2 w-2 rounded-full bg-ember-500" />
              <span className="font-mono text-xs tracking-[0.4em] text-bone-100 uppercase">
                pocketdeck
              </span>
            </motion.div>
          </div>

          {/* Tape strip top-right */}
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: { duration: 0.7, delay: 0.4 },
            }}
            className="absolute top-8 right-8 hidden md:top-12 md:right-16 md:block"
          >
            <span className="tape inline-block">96 mm · loading</span>
          </motion.div>

          {/* Big counter, bottom-left */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: { delay: 0.2, duration: 0.8 },
            }}
            className="flex items-baseline gap-3 tabular-nums text-bone-50"
          >
            <span
              className="display-headline font-normal"
              style={{ fontSize: 'clamp(4.5rem, 14vw, 10rem)', lineHeight: 0.9 }}
            >
              {String(shown).padStart(3, '0')}
            </span>
            <span className="font-mono text-2xl text-bone-300 md:text-3xl">%</span>
          </motion.div>

          {/* Right-side meta */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: { delay: 0.35, duration: 0.8 },
            }}
            className="hidden flex-col items-end gap-1 font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase md:flex"
          >
            <span>fingerboard / skate</span>
            <span>v0.1.0</span>
          </motion.div>

          {/* Progress bar across the bottom edge */}
          <motion.div
            className="absolute right-0 bottom-0 left-0 h-px bg-bone-50/10"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { delay: 0.4, duration: 0.6 },
            }}
          >
            <motion.div
              className="h-full origin-left bg-ember-500"
              animate={{ scaleX: shown / 100 }}
              transition={{ type: 'spring', stiffness: 100, damping: 26 }}
              style={{ width: '100%' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
