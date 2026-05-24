'use client';

/**
 * Preloader, deterministic first-paint reveal.
 *
 * The procedural scene has no glTF / texture work yet, so Drei's `useProgress`
 * reports active=false with progress=100 almost instantly. To make the loader
 * feel intentional we drive the displayed counter linearly off elapsed time
 * over a fixed display window. When real assets exist later, we cap the
 * displayed value at Drei's reported progress so the counter never claims
 * "loaded" while assets are still in flight.
 *
 * Lifecycle:
 *   1. Mount: counter starts at 0, RAF advances it toward 100 across
 *      MIN_DISPLAY_MS.
 *   2. As soon as Drei reports active=false AND the counter has reached 100,
 *      we hold for HOLD_AT_100_MS so users see the full reveal.
 *   3. Then the overlay fades out (FADE_OUT_MS) and unmounts.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useProgress } from '@react-three/drei';
import { pauseScroll, resumeScroll } from '@/hooks/useLenis';
import { useSceneStore } from '@/store/scene';

const MIN_DISPLAY_MS = 2000;
const HOLD_AT_100_MS = 350;
const FADE_OUT_MS = 700;

export function Preloader() {
  const { progress, active } = useProgress();
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);
  const setPreloaderDone = useSceneStore((s) => s.setPreloaderDone);
  const mountedAtRef = useRef<number>(Date.now());
  const progressRef = useRef(100); // default 100 since the scene is procedural
  progressRef.current = progress > 0 ? progress : 100;

  // RAF: linearly drive `display` from 0 -> 100 across MIN_DISPLAY_MS, but
  // never exceed Drei's reported progress (so real asset loading reads true).
  useEffect(() => {
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const elapsed = Date.now() - mountedAtRef.current;
      const t = Math.min(1, elapsed / MIN_DISPLAY_MS);
      const cap = progressRef.current;
      const driven = Math.min(cap, t * 100);
      setDisplay(driven);
      if (t < 1 || driven < cap) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  // Dismiss once (a) Drei has nothing left to load, (b) the elapsed time has
  // covered MIN_DISPLAY_MS so the counter has visibly reached 100, and (c) a
  // brief hold at 100 has passed. Flipping `done` starts the fade-out AND
  // signals the scene store so hero animations can start running — the two
  // happen at the same instant so the preloader fading away and the hero
  // text rising up overlap cleanly.
  useEffect(() => {
    if (active) return;
    const elapsed = Date.now() - mountedAtRef.current;
    const wait = Math.max(0, MIN_DISPLAY_MS - elapsed) + HOLD_AT_100_MS;
    const id = window.setTimeout(() => {
      setDone(true);
      setPreloaderDone(true);
    }, wait);
    return () => window.clearTimeout(id);
  }, [active, setPreloaderDone]);

  // Lock page scroll while the preloader is visible. Lenis isn't initialised
  // yet when this component mounts (ChromeRoot wires it up after), so the
  // pauseScroll() call queues the intent and applies it as soon as Lenis
  // exists. body overflow is locked as a backstop. Released the moment the
  // overlay starts to fade out (done flips to true).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (done) {
      document.body.style.overflow = '';
      resumeScroll();
      return;
    }
    document.body.style.overflow = 'hidden';
    pauseScroll();
    return () => {
      document.body.style.overflow = '';
      resumeScroll();
    };
  }, [done]);

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
              transition={{ duration: 0.2, ease: 'linear' }}
              style={{ width: '100%' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
