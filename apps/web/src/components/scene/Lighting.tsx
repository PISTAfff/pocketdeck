'use client';

/**
 * Lighting, three-point rig for the procedural fingerboard.
 *
 * Rebalanced for color fidelity: the previous rig had a warm key at
 * intensity 2.6 with strong amber tint (#ffd0a8) which was overpowering
 * the diffuse on dark materials. Picking Noir (#0b0b0d) read as warm
 * amber on screen, not black. New ratios:
 *   - ambient bumped to 0.45 with a neutral cool tone, so the shadow
 *     side stays readable but doesn't pick up an unintended hue
 *   - key drops to 1.5 with a much softer warm (#fff3e0). Still cinematic
 *     but doesn't drown dark surfaces in amber
 *   - rim drops to 1.0 with a slightly less saturated cool
 *   - the ember underglow shrinks to 0.3 intensity — a hint, not a wash
 *
 * The result: Noir reads as black, Midnight as deep blue, Gunmetal as
 * grey, while the warm/cool/ember accents still give the scene mood.
 */
import { ContactShadows } from '@react-three/drei';

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.45} color="#e0e3ec" />

      {/* Key light, gentle warm, top-front-right. */}
      <directionalLight
        position={[4.5, 6, 5]}
        intensity={1.5}
        color="#fff3e0"
        castShadow={false}
      />

      {/* Rim / back light, cool tone for separation. */}
      <directionalLight
        position={[-5, 3.5, -4]}
        intensity={1.0}
        color="#a4b8ff"
      />

      {/* Ember underglow, just a hint of brand accent from below. */}
      <pointLight
        position={[0, -2.5, 2]}
        intensity={0.3}
        color="#ff7d3a"
        distance={7}
        decay={2}
      />

      <ContactShadows
        position={[0, -0.7, 0]}
        opacity={0.55}
        scale={9}
        blur={2.6}
        far={4}
        resolution={512}
        color="#000000"
      />
    </>
  );
}
