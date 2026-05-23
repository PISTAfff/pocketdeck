'use client';

/**
 * Preloader — deterministic first-paint reveal.
 *
 * Subscribes to Drei's `useProgress` so we account for any glTF / texture work
 * the scene picks up later. Because today the scene is purely procedural, the
 * loader almost always shows 100% immediately; we therefore enforce a
 * minimum display window of `MIN_DISPLAY_MS` so the brand mark has a moment
 * to land. The overlay fades out via Framer Motion and removes itself from
 * the DOM so it never blocks pointer events afterwards.
 *
 * Sits above SceneRoot (z-100). ChromeRoot's intro curtain was removed in
 * favor of this single, deterministic loader.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useProgress } from '@react-three/drei';

const MIN_DISPLAY_MS = 1200;
const FADE_OUT_MS = 700;

export function Preloader() {
  const { progress, active } = useProgress();
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);
  const [mountedAt] = useState(() => Date.now());

  // Smoothly interpolate the displayed counter so it never snaps
  // from 0 -> 100 in a single tick.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setDisplay((prev) => {
        const next = prev + (progress - prev) * 0.18;
        return Math.abs(progress - next) < 0.5 ? progress : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  // Gate the dismissal on (a) Drei progress complete, (b) min display window.
  useEffect(() => {
    const elapsed = Date.now() - mountedAt;
    const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
    if (active) return;
    const id = window.setTimeout(() => setDone(true), wait);
    return () => window.clearTimeout(id);
  }, [active, mountedAt]);

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
              animate={{ y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.65, 0, 0.35, 1] } }}
              className="flex items-center gap-3"
            >
              <span className="h-2 w-2 rounded-full bg-ember-500" />
              <span className="font-mono text-xs tracking-[0.4em] text-bone-100 uppercase">
                pocketdeck
              </span>
            </motion.div>
          </div>

          {/* Counter, bottom-left */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0.2, duration: 0.8 } }}
            className="flex items-baseline gap-3 font-display tabular-nums text-bone-50"
          >
            <span className="text-7xl font-semibold tracking-tighter md:text-9xl">
              {String(shown).padStart(3, '0')}
            </span>
            <span className="text-2xl text-bone-300 md:text-3xl">%</span>
          </motion.div>

          {/* Right-side meta, bottom-right */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0.35, duration: 0.8 } }}
            className="hidden flex-col items-end gap-1 font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase md:flex"
          >
            <span>96mm fingerboard</span>
            <span>v0.1.0</span>
          </motion.div>

          {/* Progress bar across the bottom edge */}
          <motion.div
            className="absolute right-0 bottom-0 left-0 h-px bg-bone-300/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.4, duration: 0.6 } }}
          >
            <motion.div
              className="h-full origin-left bg-ember-500"
              animate={{ scaleX: shown / 100 }}
              transition={{ type: 'spring', stiffness: 90, damping: 24 }}
              style={{ width: '100%' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
