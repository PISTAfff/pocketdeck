'use client';

/**
 * Post-processing stack.
 *
 * Always-on:
 *   - Bloom (subtle, threshold tuned so only emissive accents bloom)
 *   - Vignette (gentle darkening at the corners)
 *
 * Conditionally on (driven by useSceneStore.transitioning):
 *   - ChromaticAberration during page transitions for a brief lens-shift effect
 */
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import { useMemo } from 'react';
import { useSceneStore } from '@/store/scene';

export function Effects() {
  const transitioning = useSceneStore((s) => s.transitioning);

  // Stable offset vector for chromatic aberration so React doesn't recreate it
  // each render. (postprocessing wants a THREE.Vector2.)
  const caOffset = useMemo(() => new Vector2(0.0018, 0.0018), []);

  return (
    <EffectComposer multisampling={0} stencilBuffer={false}>
      <Bloom
        intensity={0.6}
        luminanceThreshold={0.3}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.15} darkness={0.7} />
      {transitioning ? (
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={caOffset}
          radialModulation={false}
          modulationOffset={0}
        />
      ) : (
        // EffectComposer requires a JSX.Element child, not null. A disabled
        // chromatic aberration with a zero offset is a no-op visually.
        <ChromaticAberration
          blendFunction={BlendFunction.SKIP}
          offset={new Vector2(0, 0)}
          radialModulation={false}
          modulationOffset={0}
        />
      )}
    </EffectComposer>
  );
}
