'use client';

/**
 * ChromeRoot, persistent UI chrome that wraps every page.
 *
 * - Sets up Lenis smooth scroll and forwards scroll progress to the scene store.
 * - Renders the custom cursor.
 * - Mounts the <Nav /> and <Footer /> around children.
 *
 * Admin routes opt out of the storefront chrome — Nav anchor links
 * jump to homepage sections that don't exist on the dashboard and the
 * Footer takes vertical room better spent on the orders table.
 *
 * The persistent WebGL canvas (<SceneRoot />) lives in the root layout and
 * keeps rendering through transitions. The first-paint reveal is handled
 * separately by <Preloader />, which sits above this and SceneRoot.
 */
import { usePathname } from 'next/navigation';
import { CustomCursor } from '@/components/ui/CustomCursor';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { useLenis } from '@/hooks/useLenis';

interface ChromeRootProps {
  children: React.ReactNode;
}

export function ChromeRoot({ children }: ChromeRootProps) {
  useLenis();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  if (isAdmin) {
    return (
      <>
        <CustomCursor />
        <div className="page-root">{children}</div>
      </>
    );
  }

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
