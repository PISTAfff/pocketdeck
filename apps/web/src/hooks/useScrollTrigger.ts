/**
 * useScrollTrigger — registers `gsap.registerPlugin(ScrollTrigger)` exactly once
 * for the client and re-exports a stable handle.
 */
'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

function ensureRegistered() {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

/** Register once on mount. Safe to call from many components. */
export function useScrollTrigger(): typeof ScrollTrigger {
  useEffect(() => {
    ensureRegistered();
  }, []);
  return ScrollTrigger;
}

export { ScrollTrigger, gsap };
