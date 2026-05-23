'use client';

/**
 * OrderPreview, a self-contained R3F scene that shows the final custom
 * deck rotating slowly.
 *
 * Used by the Order ("Review & Buy") section. Independent of the global
 * persistent canvas:
 *   - dedicated <Canvas> mounted inside its container so the canvas can
 *     resize / animate with its parent (small box vs fullscreen)
 *   - reads `selection` from the scene store (so it always reflects the
 *     latest build the user configured)
 *   - auto-rotates on Y; gentle nod on X for life
 *   - doesn't sync to scene keyframes at all (it's about the final
 *     product, not the page section)
 *
 * The deck geometry is a stripped-down version of Deck.tsx — same
 * dimension constants and material maps, but no exploded-view / no
 * keyframe-driven motion / no part dimming.
 */
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  RoundedBox,
  ContactShadows,
  OrbitControls,
  Environment,
} from '@react-three/drei';
import { Group, MathUtils } from 'three';
import { useSceneStore } from '@/store/scene';
import {
  DECK_MATERIALS,
  WHEEL_MATERIALS,
  TRUCK_MATERIALS,
  GRIP_MATERIALS,
  type MaterialPaint,
} from '@/lib/scene/materials';

const DECK = { length: 5.4, width: 1.6, thickness: 0.12, cornerRadius: 0.22 };
const GRIP = { thickness: 0.02, inset: 0.06 };
const TRUCK = {
  baseplateW: 1.0,
  baseplateD: 0.55,
  baseplateH: 0.08,
  hangerW: 1.7,
  hangerD: 0.32,
  hangerH: 0.18,
  axleLen: 2.1,
  axleR: 0.04,
  offsetX: 1.85,
  dropY: -0.16,
};
const WHEEL_DIM = {
  radius: 0.28,
  width: 0.22,
  offsetZ: 0.92,
  bearingR: 0.08,
  bearingW: 0.24,
};

function Mat({ paint }: { paint: MaterialPaint }) {
  return (
    <meshStandardMaterial
      color={paint.color}
      metalness={paint.metalness}
      roughness={paint.roughness}
      emissive={paint.emissive ?? '#000000'}
      emissiveIntensity={paint.emissiveIntensity ?? 0}
    />
  );
}

function Truck({
  isFront,
  truckPaint,
  wheelPaint,
}: {
  isFront: boolean;
  truckPaint: MaterialPaint;
  wheelPaint: MaterialPaint;
}) {
  const baseX = isFront ? TRUCK.offsetX : -TRUCK.offsetX;
  return (
    <group position={[baseX, TRUCK.dropY, 0]}>
      <mesh position={[0, TRUCK.baseplateH / 2, 0]}>
        <boxGeometry args={[TRUCK.baseplateW, TRUCK.baseplateH, TRUCK.baseplateD]} />
        <Mat paint={truckPaint} />
      </mesh>
      <mesh position={[0, -TRUCK.hangerH / 2, 0]}>
        <boxGeometry args={[TRUCK.hangerW, TRUCK.hangerH, TRUCK.hangerD]} />
        <Mat paint={truckPaint} />
      </mesh>
      <mesh position={[0, -TRUCK.hangerH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[TRUCK.axleR, TRUCK.axleR, TRUCK.axleLen, 18]} />
        <Mat paint={truckPaint} />
      </mesh>
      {[1, -1].map((sign) => (
        <group
          key={sign}
          position={[0, -TRUCK.hangerH, sign * WHEEL_DIM.offsetZ]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <mesh>
            <cylinderGeometry
              args={[WHEEL_DIM.radius, WHEEL_DIM.radius, WHEEL_DIM.width, 28]}
            />
            <Mat paint={wheelPaint} />
          </mesh>
          <mesh>
            <cylinderGeometry
              args={[
                WHEEL_DIM.bearingR,
                WHEEL_DIM.bearingR,
                WHEEL_DIM.bearingW,
                16,
              ]}
            />
            <meshStandardMaterial color="#1a1a22" metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

interface RotatingDeckProps {
  autoRotate: boolean;
}

function RotatingDeck({ autoRotate }: RotatingDeckProps) {
  const selection = useSceneStore((s) => s.selection);
  const root = useRef<Group>(null);

  const deckPaint = useMemo(() => DECK_MATERIALS[selection.deck], [selection.deck]);
  const wheelPaint = useMemo(() => WHEEL_MATERIALS[selection.wheel], [selection.wheel]);
  const truckPaint = useMemo(() => TRUCK_MATERIALS[selection.truck], [selection.truck]);
  const gripPaint = useMemo(() => GRIP_MATERIALS[selection.grip], [selection.grip]);

  useFrame((_, delta) => {
    if (!root.current) return;
    if (!autoRotate) return; // OrbitControls owns the orientation while expanded.
    // Slow turntable on Y, gentle drift on X for life.
    root.current.rotation.y += delta * 0.38;
    const t = performance.now() * 0.001;
    root.current.rotation.x = MathUtils.lerp(
      root.current.rotation.x,
      -0.16 + Math.sin(t * 0.6) * 0.04,
      0.05,
    );
  });

  return (
    <group
      ref={root}
      rotation={[-0.18, 0, 0]}
      position={[0, 0.1, 0]}
      // When user is dragging, OrbitControls rotates the camera, so the deck
      // root scale/position stays still and the user reads the geometry from
      // any angle.
    >
      <RoundedBox
        args={[DECK.length, DECK.thickness, DECK.width]}
        radius={DECK.cornerRadius}
        smoothness={4}
        bevelSegments={3}
      >
        <Mat paint={deckPaint} />
      </RoundedBox>
      {deckPaint.accent && (
        <mesh position={[0, -DECK.thickness / 2 - 0.001, 0]}>
          <boxGeometry args={[DECK.length * 0.85, 0.005, DECK.width * 0.6]} />
          <meshStandardMaterial
            color={deckPaint.accent}
            metalness={deckPaint.metalness * 0.5}
            roughness={deckPaint.roughness}
          />
        </mesh>
      )}
      <RoundedBox
        args={[DECK.length - GRIP.inset, GRIP.thickness, DECK.width - GRIP.inset]}
        radius={DECK.cornerRadius * 0.85}
        smoothness={3}
        bevelSegments={2}
        position={[0, DECK.thickness / 2 + GRIP.thickness / 2, 0]}
      >
        <Mat paint={gripPaint} />
      </RoundedBox>
      <GripAccent pattern={selection.grip} paint={gripPaint} />
      <Truck isFront truckPaint={truckPaint} wheelPaint={wheelPaint} />
      <Truck isFront={false} truckPaint={truckPaint} wheelPaint={wheelPaint} />
    </group>
  );
}

/**
 * Pattern-specific grip accent for the order preview. Mirrors the
 * GripPatternAccent in Deck.tsx exactly so the small preview tile, the
 * expanded fullscreen view, and the main configurator scene all show
 * the same level of grip detail.
 */
function GripAccent({
  pattern,
  paint,
}: {
  pattern: 'classic' | 'tiger' | 'topo';
  paint: MaterialPaint;
}) {
  const accentColor = paint.accent ?? '#1a1a22';
  // Lifted above the grip surface (was +0.003, too close — pattern was
  // sort-fighting the grip layer and disappearing).
  const topY = DECK.thickness / 2 + GRIP.thickness + 0.02;
  const gripLength = DECK.length - GRIP.inset;
  const gripWidth = DECK.width - GRIP.inset;

  if (pattern === 'tiger') {
    const stripes = [
      { z: -gripWidth * 0.36, w: gripWidth * 0.06 },
      { z: -gripWidth * 0.18, w: gripWidth * 0.08 },
      { z: 0, w: gripWidth * 0.1 },
      { z: gripWidth * 0.18, w: gripWidth * 0.08 },
      { z: gripWidth * 0.36, w: gripWidth * 0.06 },
    ];
    return (
      <group position={[0, topY, 0]} renderOrder={1}>
        {stripes.map((s, i) => (
          <mesh key={i} position={[0, 0, s.z]} renderOrder={1}>
            <boxGeometry args={[gripLength * 0.88, 0.02, s.w]} />
            <meshStandardMaterial
              color={accentColor}
              roughness={paint.roughness}
              metalness={paint.metalness}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (pattern === 'topo') {
    const rings = [0.14, 0.24, 0.34, 0.44, 0.54, 0.64];
    return (
      <group position={[0, topY, 0]} renderOrder={1}>
        {rings.map((scale, i) => (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[gripLength * scale, gripWidth * scale * 0.55, 1]}
            renderOrder={1}
          >
            <ringGeometry args={[0.45, 0.5, 64]} />
            <meshStandardMaterial
              color={accentColor}
              roughness={paint.roughness}
              metalness={paint.metalness}
              transparent={i > 0}
              opacity={1 - i * 0.06}
              side={2}
            />
          </mesh>
        ))}
      </group>
    );
  }

  // classic: 6x3 grit-dot grid
  const cols = 6;
  const rows = 3;
  const dots: { x: number; z: number }[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const t = i / (cols - 1);
      const u = j / (rows - 1);
      dots.push({
        x: (t - 0.5) * gripLength * 0.78,
        z: (u - 0.5) * gripWidth * 0.6,
      });
    }
  }
  const dotR = gripWidth * 0.025;
  return (
    <group position={[0, topY, 0]} renderOrder={1}>
      {dots.map((d, i) => (
        <mesh key={i} position={[d.x, 0, d.z]} renderOrder={1}>
          <cylinderGeometry args={[dotR, dotR, 0.015, 16]} />
          <meshStandardMaterial
            color={accentColor}
            roughness={paint.roughness}
            metalness={paint.metalness}
          />
        </mesh>
      ))}
    </group>
  );
}

interface OrderPreviewProps {
  expanded: boolean;
}

export function OrderPreview({ expanded }: OrderPreviewProps) {
  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{
          position: [0, 1.5, 7.4],
          fov: expanded ? 26 : 30,
          near: 0.1,
          far: 60,
        }}
        frameloop="always"
      >
        <color attach="background" args={['#07070a']} />
        <fog attach="fog" args={['#07070a', 9, 22]} />

        {/* Base ambient. Slightly brighter when expanded so the user can see
            from any angle they rotate to. */}
        <ambientLight intensity={expanded ? 0.55 : 0.45} />

        {/* Warm key light, top-front. Strong when expanded (subject of the
            shot) and softer in the small preview tile. */}
        <directionalLight
          position={[3, 4, 4]}
          intensity={expanded ? 1.2 : 0.9}
          color="#ffe6c4"
          castShadow={false}
        />

        {/* Cool back-rim so the silhouette reads against the dark room. */}
        <directionalLight
          position={[-4, 2, -2]}
          intensity={expanded ? 0.75 : 0.55}
          color="#88a5d6"
        />

        {/* Ember underglow from below for the brand accent. */}
        <pointLight
          position={[0, -1.6, 0]}
          intensity={expanded ? 0.7 : 0.5}
          color="#ff5b14"
          distance={7}
        />

        {/* Extra spotlight in the expanded view to throw a tight highlight
            on whatever surface the user is rotating toward. Skipped in the
            small tile to keep the GPU budget light. */}
        {expanded && (
          <spotLight
            position={[2, 5, 5]}
            angle={0.55}
            penumbra={0.6}
            intensity={1.1}
            color="#ffffff"
            distance={20}
          />
        )}

        <Suspense fallback={null}>
          {/* Subtle studio reflection cube so the polished trucks pick up a
              real environment instead of flat shading. Only in expanded mode
              because the studio preset takes a beat to load. */}
          {expanded && <Environment preset="studio" environmentIntensity={0.4} />}

          <RotatingDeck autoRotate={!expanded} />

          <ContactShadows
            position={[0, -0.65, 0]}
            opacity={expanded ? 0.7 : 0.55}
            scale={expanded ? 11 : 9}
            blur={expanded ? 2.0 : 2.4}
            far={3}
            color="#000000"
          />
        </Suspense>

        {/* Drag to rotate, wheel/pinch to zoom, double-click to reset.
            Panning is disabled so users can't push the model off-screen. */}
        {expanded && (
          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.12}
            rotateSpeed={0.8}
            zoomSpeed={0.7}
            minDistance={4}
            maxDistance={14}
            // Lock the camera to a hemisphere above the deck — no upside-down
            // gymnastics; users can still look at it from the side.
            minPolarAngle={Math.PI * 0.18}
            maxPolarAngle={Math.PI * 0.82}
          />
        )}
      </Canvas>

      {/* Helper hint, only while expanded */}
      {expanded && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink-900/70 px-4 py-2 font-mono text-[10px] tracking-[0.28em] text-bone-200 uppercase ring-1 ring-bone-50/10 backdrop-blur">
          Drag to rotate · scroll to zoom
        </div>
      )}
    </div>
  );
}
