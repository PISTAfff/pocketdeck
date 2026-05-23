/**
 * useLenis — single source of truth for smooth scroll.
 *
 * - Instantiates one Lenis instance.
 * - Drives the GSAP ticker (so ScrollTrigger stays in sync with smooth scroll).
 * - Forwards normalized scroll progress (0..1) into the scene store.
 */
'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { useSceneStore } from '@/store/scene';
import { useScrollTrigger, ScrollTrigger } from './useScrollTrigger';

export function useLenis() {
  const lenisRef = useRef<Lenis | null>(null);
  useScrollTrigger();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const lenis = new Lenis({
      duration: 1.2,
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
      autoRaf: false,
    });
    lenisRef.current = lenis;

    const setScrollProgress = useSceneStore.getState().setScrollProgress;

    const unsubscribe = lenis.on('scroll', () => {
      const limit = lenis.limit || 1;
      const p = Math.min(1, Math.max(0, lenis.scroll / limit));
      setScrollProgress(p);
      ScrollTrigger.update();
    });

    // Drive Lenis from GSAP's ticker — keeps everything on one clock.
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      unsubscribe();
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return lenisRef;
}
