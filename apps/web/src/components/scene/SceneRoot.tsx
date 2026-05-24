'use client';

/**
 * SceneRoot, the persistent fixed-position R3F canvas.
 *
 * Mounted once by app/layout.tsx. Survives route changes because it lives at
 * the root layout level. The canvas itself stays mounted even when its
 * opacity is zero, so the GL context is never thrown away.
 *
 * The wrapper opacity is driven by `useSceneStore.sceneOpacity`, which the
 * useLenis scroll handler interpolates between 1 (top half of the page) and
 * 0 (Tricks / Order / Footer). That gives us a clean visual cutoff between
 * the 3D half of the experience and the form half, without unmounting WebGL.
 *
 * The canvas background is also transparent (alpha = true, no <color attach="background">)
 * so the body's dark ink color shows through when the canvas fades, which
 * means no flash of black during the cross-fade.
 *
 * Performance contract:
 *   - dpr capped at [1, 1.5]
 *   - antialias on
 *   - frameloop = 'always' while visible; switches to 'never' when faded
 *     out so we don't burn frames on an invisible scene
 *   - powerPreference = 'high-performance'
 *   - pointer-events: none on the wrapper so DOM keeps cursor events
 */
import { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Lighting } from './Lighting';
import { Effects } from './Effects';
import { SceneCamera } from './SceneCamera';
import { Deck } from './Deck';
import { useSceneStore } from '@/store/scene';
import { getSceneOpacity } from '@/lib/scene/keyframes';

export function SceneRoot() {
  const [isMounted, setIsMounted] = useState(false);
  const scrollOpacity = useSceneStore((s) => s.sceneOpacity);
  const activeSection = useSceneStore((s) => s.activeSection);
  const wizardPhase = useSceneStore((s) => s.wizardPhase);

  // Final opacity is the more-restrictive of the scroll fade and the
  // per-section cap. Manifesto, for example, caps the canvas at 0.3 so the
  // deck reads as a faded background element behind the grid (#16).
  // During the configurator's package phase we hide the main canvas
  // outright: each package card hosts its own R3F mini scene with its
  // own lighting, and a dark deck silhouette behind translucent cards
  // would otherwise drift as the user scrolls.
  let sceneOpacity = Math.min(scrollOpacity, getSceneOpacity(activeSection));
  if (wizardPhase === 'package' && activeSection === 'configurator') {
    sceneOpacity = 0;
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="scene-root" aria-hidden />;
  }

  // Avoid wasting frames when fully transparent.
  const frameloop = sceneOpacity <= 0.01 ? 'never' : 'always';

  return (
    <div
      className="scene-root"
      aria-hidden
      style={{
        opacity: sceneOpacity,
        transition: 'opacity 360ms cubic-bezier(0.65, 0, 0.35, 1)',
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        frameloop={frameloop}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        camera={{ position: [0, 1.4, 7.2], fov: 32, near: 0.1, far: 100 }}
      >
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
