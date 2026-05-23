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
 *
 * Page layout (in viewports of document scroll):
 *   Hero 1, Manifesto 1, Anatomy 5 (pinned), Configurator 5 (pinned),
 *   Tricks ~1.2, Order ~1.5, Footer ~0.7. Total ~15.4 viewports.
 *
 * The configurator review step ends around 12 / 15.4 = 0.78, so we hold
 * the canvas at full opacity until then and fade out across the brief gap
 * before Tricks.
 */
const FADE_START = 0.78;
const FADE_END = 0.84;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function opacityForProgress(p: number): number {
  if (p <= FADE_START) return 1;
  if (p >= FADE_END) return 0;
  return 1 - (p - FADE_START) / (FADE_END - FADE_START);
}

let lenisSingleton: Lenis | null = null;

/**
 * Smoothly scroll to a hash target (e.g. "#order"). Safe to call from any
 * client component. Uses a 600ms ease-out per the visual spec (#6).
 */
export function scrollToHash(hash: string): void {
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  const node = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (!node) return;
  if (lenisSingleton) {
    lenisSingleton.scrollTo(node, {
      offset: -80,
      duration: 0.6,
      easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
    });
  } else {
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** Smoothly scroll to an absolute Y position. Routes through Lenis when available. */
export function scrollToY(y: number, durationSec = 0.6): void {
  if (lenisSingleton) {
    lenisSingleton.scrollTo(y, {
      duration: durationSec,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  } else if (typeof window !== 'undefined') {
    window.scrollTo({ top: y, behavior: 'smooth' });
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
