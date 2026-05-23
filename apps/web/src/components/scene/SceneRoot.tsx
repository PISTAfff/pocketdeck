'use client';

/**
 * SceneRoot — the persistent fixed-position R3F canvas.
 *
 * Mounted once by app/layout.tsx. Survives route changes because it lives at
 * the root layout level — Next.js never unmounts the layout while navigating
 * within the same segment.
 *
 * The Canvas is gated behind an `isMounted` flag so it never renders during
 * SSR (WebGL contexts can't be created on the server). On the first client
 * pass `isMounted` flips to true and the <Canvas> takes over.
 *
 * Phase 2C's <ChromeRoot> renders DOM content over the top of this canvas via
 * the `.scene-root` (this canvas) / `.page-root` (DOM) z-index stack defined
 * in globals.css.
 *
 * Performance contract:
 *   - dpr capped at [1, 1.5]
 *   - antialias on (good silhouettes for a small product shot)
 *   - frameloop = 'always' — Lenis-driven scroll and idle floats both need it
 *     and the procedural scene is light enough to afford it
 *   - powerPreference = 'high-performance'
 *   - pointer-events: none on the wrapper so the DOM keeps cursor events
 */
import { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Lighting } from './Lighting';
import { Effects } from './Effects';
import { SceneCamera } from './SceneCamera';
import { Deck } from './Deck';

export function SceneRoot() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // SSR / first paint: render the wrapper only. Layout below stays stable
    // and the Canvas mounts on the next client tick.
    return <div className="scene-root" aria-hidden />;
  }

  return (
    <div className="scene-root" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        frameloop="always"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        camera={{ position: [0, 1.4, 7.2], fov: 32, near: 0.1, far: 100 }}
      >
        <color attach="background" args={['#07070a']} />
        <fog attach="fog" args={['#07070a', 9, 22]} />
        <Suspense fallback={null}>
          <SceneCamera />
          <Lighting />
          <Deck />
          <Effects />
        </Suspense>
      </Canvas>
    </div>
  );
}
