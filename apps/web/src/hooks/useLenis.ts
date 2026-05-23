/**
 * useLenis, single source of truth for smooth scroll.
 *
 * - Instantiates one Lenis instance.
 * - Drives the GSAP ticker (so ScrollTrigger stays in sync with smooth scroll).
 * - Forwards normalized scroll progress (0..1) into the scene store.
 * - Derives the canvas-wrapper opacity from scroll progress so the persistent
 *   3D scene cleanly fades out between the configurator and the form half.
 * - Exposes a `scrollTo(target)` helper bound to the live instance.
 */
'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { useSceneStore } from '@/store/scene';
import { useScrollTrigger, ScrollTrigger } from './useScrollTrigger';

/**
 * Scroll progress milestones at which the canvas opacity ramps.
 * The page has six sections of roughly equal height; the configurator finishes
 * around 4/6 = 0.66 of the total page, and we want the canvas hidden by the
 * top of Tricks (5/6 = 0.83). Hence the ramp window 0.62 to 0.75.
 */
const FADE_START = 0.62;
const FADE_END = 0.75;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function opacityForProgress(p: number): number {
  if (p <= FADE_START) return 1;
  if (p >= FADE_END) return 0;
  return 1 - (p - FADE_START) / (FADE_END - FADE_START);
}

let lenisSingleton: Lenis | null = null;

/** Smoothly scroll to a hash target (e.g. "#order"). Safe to call from any client component. */
export function scrollToHash(hash: string): void {
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  const node = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (!node) return;
  if (lenisSingleton) {
    lenisSingleton.scrollTo(node, { offset: -80, duration: 1.4 });
  } else {
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

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
    lenisSingleton = lenis;

    const setScrollProgress = useSceneStore.getState().setScrollProgress;
    const setSceneOpacity = useSceneStore.getState().setSceneOpacity;
    let lastOpacity = 1;

    const unsubscribe = lenis.on('scroll', () => {
      const limit = lenis.limit || 1;
      const p = clamp01(lenis.scroll / limit);
      setScrollProgress(p);
      const target = opacityForProgress(p);
      // Avoid flooding zustand subscribers when the value barely changes.
      if (Math.abs(target - lastOpacity) > 0.005) {
        lastOpacity = target;
        setSceneOpacity(target);
      }
      ScrollTrigger.update();
    });

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
      if (lenisSingleton === lenis) lenisSingleton = null;
    };
  }, []);

  return lenisRef;
}
