'use client';

/**
 * ChromeRoot, persistent UI chrome that wraps every page.
 *
 * - Sets up Lenis smooth scroll and forwards scroll progress to the scene store.
 * - Renders the custom cursor.
 * - Mounts the <Nav /> and <Footer /> around children.
 *
 * The persistent WebGL canvas (<SceneRoot />) lives in the root layout and
 * keeps rendering through transitions. The first-paint reveal is handled
 * separately by <Preloader />, which sits above this and SceneRoot.
 */
import { CustomCursor } from '@/components/ui/CustomCursor';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { useLenis } from '@/hooks/useLenis';

interface ChromeRootProps {
  children: React.ReactNode;
}

export function ChromeRoot({ children }: ChromeRootProps) {
  useLenis();

  return (
    <>
      <CustomCursor />
      <Nav />
      <div className="page-root">
        {children}
        <Footer />
      </div>
    </>
  );
}
