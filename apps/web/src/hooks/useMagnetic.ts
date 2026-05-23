/**
 * useMagnetic — math + listeners for the magnetic-button effect.
 *
 * Returns a ref to attach to the outer wrapper plus the translated x/y values
 * as MotionValues so the consumer can drive a motion.div without re-rendering.
 */
'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion';

interface MagneticConfig {
  /** Radius (px) within which the magnet activates. */
  radius?: number;
  /** Pull strength — fraction of the offset to apply. 0..1. */
  strength?: number;
}

interface UseMagneticReturn<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}

export function useMagnetic<T extends HTMLElement = HTMLDivElement>(
  { radius = 80, strength = 0.45 }: MagneticConfig = {},
): UseMagneticReturn<T> {
  const ref = useRef<T | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 280, damping: 22, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 280, damping: 22, mass: 0.5 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        rawX.set(0);
        rawY.set(0);
        return;
      }
      rawX.set(dx * strength);
      rawY.set(dy * strength);
    };

    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [radius, strength, rawX, rawY]);

  return { ref, x, y };
}
