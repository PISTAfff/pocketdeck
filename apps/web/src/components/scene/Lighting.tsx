'use client';

/**
 * Lighting, moody three-point setup for the procedural fingerboard.
 *
 * - Ambient base so shadow side never goes black
 * - Warm key light from upper-front-right
 * - Cool rim light from upper-back-left
 * - Soft fill from below to lift the underside
 * - ContactShadows under the deck to ground it
 */
import { ContactShadows } from '@react-three/drei';

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#dfe1eb" />

      {/* Warm key light. */}
      <directionalLight
        position={[4.5, 6, 5]}
        intensity={2.6}
        color="#ffd0a8"
        castShadow={false}
      />

      {/* Cool rim/back light. */}
      <directionalLight
        position={[-5, 3.5, -4]}
        intensity={1.8}
        color="#8aa0ff"
      />

      {/* Soft underglow / fill. */}
      <pointLight
        position={[0, -2.5, 2]}
        intensity={0.6}
        color="#ff7d3a"
        distance={9}
        decay={2}
      />

      {/* Ground the deck visually. */}
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
