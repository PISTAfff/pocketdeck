'use client';

/**
 * ChromeRoot — persistent UI chrome that wraps every page.
 *
 * - Sets up Lenis smooth scroll and forwards scroll progress to the scene store.
 * - Renders the custom cursor.
 * - Plays a one-shot intro curtain reveal (curtain starts covering the page
 *   and slides up off the top once mounted).
 * - Mounts the <Nav /> and <Footer /> around children.
 *
 * The persistent WebGL canvas (<SceneRoot />) lives in the root layout and
 * keeps rendering through transitions — we only wipe DOM overlays here.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CustomCursor } from '@/components/ui/CustomCursor';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { useLenis } from '@/hooks/useLenis';

interface ChromeRootProps {
  children: React.ReactNode;
}

export function ChromeRoot({ children }: ChromeRootProps) {
  useLenis();
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    // Lift the curtain on next tick so the initial paint is hidden by it.
    const id = window.setTimeout(() => setIntroDone(true), 50);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <CustomCursor />
      <Nav />
      <div className="page-root">
        {children}
        <Footer />
      </div>
      <AnimatePresence>
        {!introDone && (
          <motion.div
            key="intro-curtain"
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[90] bg-ink-950"
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            exit={{
              y: '-100%',
              transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] },
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
