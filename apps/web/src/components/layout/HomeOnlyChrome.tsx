'use client';

/**
 * Mounts the persistent 3D canvas + preloader only on the home page.
 *
 * Both pieces depend on Three.js, drei, postprocessing, and the deck
 * geometry/materials — collectively hundreds of KB of code that admin /
 * about / faq / track-order have no use for. Pulling them out of the
 * root layout and gating mount on `pathname === '/'` skips the bundle
 * cost entirely on those routes (Next.js code-splits dynamic() imports
 * into separate chunks).
 *
 * `ssr: false` is required because R3F (and Drei's `useProgress`)
 * touch WebGL / browser-only APIs at construction time.
 */
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const SceneRoot = dynamic(
  () => import('@/components/scene/SceneRoot').then((m) => m.SceneRoot),
  { ssr: false },
);
const Preloader = dynamic(
  () => import('@/components/ui/Preloader').then((m) => m.Preloader),
  { ssr: false },
);

export function HomeOnlyChrome() {
  const pathname = usePathname();
  if (pathname !== '/') return null;
  return (
    <>
      <Preloader />
      <SceneRoot />
    </>
  );
}
