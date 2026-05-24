'use client';

/**
 * MiniSkateScene, a tiny self-contained R3F canvas that lives inside a
 * package card. Renders 1, 2, or 3 simplified skateboard models with
 * their own ambient + key + ember underglow lighting.
 *
 * "Self-contained" is the important property here - this canvas does NOT
 * share lights or camera with the persistent main canvas, so its lighting
 * never drifts as the user scrolls. The frame loop is on demand, kicking
 * up to "always" only when the parent reports `hovered`, so a row of three
 * idle cards costs no GPU until the user hovers in.
 */
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Group,
  MathUtils,
  Shape,
} from 'three';

const DECK = {
  length: 5.4,
  width: 1.6,
  thickness: 0.12,
  flatRatio: 0.6,
  kickRise: 2.4,
};

/** Mirror of buildDeckShape in Deck.tsx but kept local so we don't take
 *  on a dependency on the giant main scene module. */
function buildDeckShape(): Shape {
  const shape = new Shape();
  const halfL = DECK.length / 2;
  const halfT = DECK.thickness / 2;
  const flatHalf = halfL * DECK.flatRatio;
  const kickTipY = halfT + DECK.thickness * DECK.kickRise * 0.5;
  shape.moveTo(-halfL, -halfT);
  shape.lineTo(halfL, -halfT);
  shape.lineTo(halfL, kickTipY);
  shape.lineTo(flatHalf, halfT);
  shape.lineTo(-flatHalf, halfT);
  shape.lineTo(-halfL, kickTipY);
  shape.lineTo(-halfL, -halfT);
  shape.closePath();
  return shape;
}

const DECK_SHAPE = buildDeckShape();

interface MiniDeckProps {
  index: number;
  count: number;
  hovered: boolean;
  hue: string;
  /** Vertical row offset so multiple decks stack visibly. */
  yOffset: number;
}

function MiniDeck({ index, count, hovered, hue, yOffset }: MiniDeckProps) {
  const ref = useRef<Group>(null);
  // Stagger the start phase so 3 decks don't rotate in lockstep.
  const phase = useMemo(() => index * 0.6, [index]);
  useFrame((_, delta) => {
    const root = ref.current;
    if (!root) return;
    // Spin speed: idle slow, hover fast. delta makes it framerate-stable.
    const targetSpin = hovered ? 0.85 : 0.32;
    root.rotation.y += targetSpin * delta;
    // Hover lift + small wobble.
    const t = performance.now() * 0.001 + phase;
    const targetY = yOffset + (hovered ? 0.4 : 0) + Math.sin(t * 1.6) * 0.08;
    root.position.y = MathUtils.lerp(root.position.y, targetY, 0.08);
    // X stagger spreads boards apart on hover.
    const spread = hovered ? 0.6 : 0.2;
    const xOffset =
      count === 1 ? 0 : (index - (count - 1) / 2) * (count === 2 ? 1.4 : 1.1);
    root.position.x = MathUtils.lerp(
      root.position.x,
      xOffset * (1 + spread),
      0.08,
    );
    // Tilt the board a touch on hover.
    const targetTilt = hovered ? -0.32 : -0.18;
    root.rotation.x = MathUtils.lerp(root.rotation.x, targetTilt, 0.08);
  });

  return (
    <group ref={ref} position={[0, yOffset, 0]} rotation={[-0.18, 0, 0]}>
      {/* Deck plate */}
      <mesh position={[0, 0, -DECK.width / 2]}>
        <extrudeGeometry
          args={[
            DECK_SHAPE,
            {
              depth: DECK.width,
              bevelEnabled: true,
              bevelThickness: 0.02,
              bevelSize: 0.02,
              bevelSegments: 2,
              curveSegments: 8,
            },
          ]}
        />
        <meshStandardMaterial
          color={hue}
          metalness={0.15}
          roughness={0.65}
        />
      </mesh>
      {/* Trucks (front + back) */}
      {[1, -1].map((sign) => (
        <group key={sign} position={[sign * 1.6, -0.18, 0]}>
          <mesh>
            <boxGeometry args={[0.9, 0.08, 0.5]} />
            <meshStandardMaterial color="#bcc0c5" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 2, 12]} />
            <meshStandardMaterial color="#bcc0c5" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Wheels */}
          {[1, -1].map((s2) => (
            <group key={s2} position={[0, -0.18, s2 * 0.85]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh>
                <cylinderGeometry args={[0.27, 0.27, 0.22, 18]} />
                <meshStandardMaterial color="#efe6d6" metalness={0.05} roughness={0.55} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.08, 0.08, 0.23, 12]} />
                <meshStandardMaterial color="#1a1a22" metalness={0.85} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Hue palette for the trio so 3 decks read as distinct boards. */
const HUES = ['#f5f5f0', '#ff5b14', '#ffb27a'];

function MiniRig({ count, hovered }: { count: 1 | 2 | 3; hovered: boolean }) {
  // Stack the decks vertically. Original spacing - boards at full size.
  // The mini scene's CANVAS in PackageHero is positioned to sit in the
  // UPPER portion of the card's middle area so the CHOOSE pill that
  // lives at the bottom doesn't cover the boards.
  const yStep = 0.9;
  const yStart = count === 1 ? 0 : (count - 1) * (yStep / 2);
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <MiniDeck
          key={i}
          index={i}
          count={count}
          hovered={hovered}
          hue={HUES[i % HUES.length]!}
          yOffset={yStart - i * yStep}
        />
      ))}
    </>
  );
}

export function MiniSkateScene({
  count,
  hovered,
}: {
  count: 1 | 2 | 3;
  hovered: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      // 'always' regardless of hover - the idle spin is slow and the
      // continuous motion is the point of the card. dpr cap keeps the
      // GPU cost in check on the trio.
      frameloop="always"
      camera={{ position: [0, 1.6, 8.4], fov: 26, near: 0.1, far: 30 }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Self-contained lighting. No connection to the main canvas, so
          scroll has no effect on these lights. */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3, 4, 4]}
        intensity={1.05}
        color="#ffe6c4"
      />
      <directionalLight
        position={[-4, 2, -2]}
        intensity={0.55}
        color="#88a5d6"
      />
      {/* Ember underglow - the brand accent light. Brighter while hovered. */}
      <pointLight
        position={[0, -1.6, 0]}
        intensity={hovered ? 1.1 : 0.7}
        color="#ff5b14"
        distance={9}
      />
      <Suspense fallback={null}>
        <MiniRig count={count} hovered={hovered} />
      </Suspense>
    </Canvas>
  );
}
