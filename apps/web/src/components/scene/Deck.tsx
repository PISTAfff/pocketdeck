'use client';

/**
 * Deck, the procedural fingerboard.
 *
 * Built entirely from three.js primitives (no GLTF). The hierarchy:
 *
 *   <group> deckRoot (animated by scroll keyframes)
 *     <group> board (RoundedBox deck plate)
 *       grip tape sheet on top
 *     <group> truckGroup (front + back trucks)
 *       <group> truck × 2
 *         axle (cylinder)
 *         baseplate (box)
 *         hanger (box)
 *         wheelGroup × 2
 *           wheel (cylinder)
 *           bearing (small dark cylinder)
 *
 * Materials read from useSceneStore.selection so the configurator can re-color
 * in real time. Explosion offsets apply when state.exploded is true.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Group, Vector3, MathUtils } from 'three';
import { useSceneStore } from '@/store/scene';
import { getDeckKeyframe } from '@/lib/scene/keyframes';
import {
  DECK_MATERIALS,
  WHEEL_MATERIALS,
  TRUCK_MATERIALS,
  GRIP_MATERIALS,
  type MaterialPaint,
} from '@/lib/scene/materials';

// --- Dimensions (world units). Tuned to read well at FOV ~32 from z=7. ----
const DECK = {
  length: 5.4,
  width: 1.6,
  thickness: 0.12,
  cornerRadius: 0.22,
};
const GRIP = {
  thickness: 0.02,
  inset: 0.06, // shrink grip slightly relative to deck so edges show
};
const TRUCK = {
  baseplateW: 1.0,
  baseplateD: 0.55,
  baseplateH: 0.08,
  hangerW: 1.7,
  hangerD: 0.32,
  hangerH: 0.18,
  axleLen: 2.1,
  axleR: 0.04,
  offsetX: 1.85, // distance from deck center to truck center along length
  dropY: -0.16, // distance below deck underside
};
const WHEEL = {
  radius: 0.28,
  width: 0.22,
  offsetZ: 0.92, // wheel offset from truck center along width
  bearingR: 0.08,
  bearingW: 0.24, // slightly wider than wheel so it pokes
};

// Explode targets, direction each part flies relative to the assembled deck.
const EXPLODE_BOARD = new Vector3(0, 0.35, 0);
const EXPLODE_TRUCK_FRONT = new Vector3(0.9, -0.4, 0);
const EXPLODE_TRUCK_BACK = new Vector3(-0.9, -0.4, 0);
const EXPLODE_WHEEL = new Vector3(0, -0.2, 0.45);

// --- Material primitive helper ----------------------------------------------
function PaintedMaterial({ paint }: { paint: MaterialPaint }) {
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

// --- Truck (one axle + two wheels) -----------------------------------------
interface TruckProps {
  isFront: boolean;
  truckPaint: MaterialPaint;
  wheelPaint: MaterialPaint;
  exploded: boolean;
}

function Truck({ isFront, truckPaint, wheelPaint, exploded }: TruckProps) {
  const ref = useRef<Group>(null);
  const explodeTarget = isFront ? EXPLODE_TRUCK_FRONT : EXPLODE_TRUCK_BACK;
  const baseX = isFront ? TRUCK.offsetX : -TRUCK.offsetX;

  useFrame(() => {
    if (!ref.current) return;
    const tx = baseX + (exploded ? explodeTarget.x : 0);
    const ty = TRUCK.dropY + (exploded ? explodeTarget.y : 0);
    ref.current.position.x = MathUtils.lerp(ref.current.position.x, tx, 0.12);
    ref.current.position.y = MathUtils.lerp(ref.current.position.y, ty, 0.12);
  });

  return (
    <group ref={ref} position={[baseX, TRUCK.dropY, 0]}>
      {/* Baseplate bolted to underside. */}
      <mesh position={[0, TRUCK.baseplateH / 2, 0]}>
        <boxGeometry
          args={[TRUCK.baseplateW, TRUCK.baseplateH, TRUCK.baseplateD]}
        />
        <PaintedMaterial paint={truckPaint} />
      </mesh>

      {/* Hanger, the angled chunk holding the axle. */}
      <mesh position={[0, -TRUCK.hangerH / 2, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[TRUCK.hangerW, TRUCK.hangerH, TRUCK.hangerD]} />
        <PaintedMaterial paint={truckPaint} />
      </mesh>

      {/* Axle, cylinder lying along Z. */}
      <mesh
        position={[0, -TRUCK.hangerH, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry
          args={[TRUCK.axleR, TRUCK.axleR, TRUCK.axleLen, 18]}
        />
        <PaintedMaterial paint={truckPaint} />
      </mesh>

      {/* Two wheels, mirrored on Z. */}
      {[1, -1].map((sign) => (
        <Wheel
          key={sign}
          z={sign * WHEEL.offsetZ}
          y={-TRUCK.hangerH}
          wheelPaint={wheelPaint}
          exploded={exploded}
          explodeZ={sign * EXPLODE_WHEEL.z}
        />
      ))}
    </group>
  );
}

// --- Wheel ------------------------------------------------------------------
interface WheelProps {
  z: number;
  y: number;
  wheelPaint: MaterialPaint;
  exploded: boolean;
  explodeZ: number;
}

function Wheel({ z, y, wheelPaint, exploded, explodeZ }: WheelProps) {
  const ref = useRef<Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    const tz = z + (exploded ? explodeZ : 0);
    const ty = y + (exploded ? EXPLODE_WHEEL.y : 0);
    ref.current.position.z = MathUtils.lerp(ref.current.position.z, tz, 0.12);
    ref.current.position.y = MathUtils.lerp(ref.current.position.y, ty, 0.12);
  });

  return (
    <group ref={ref} position={[0, y, z]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Wheel cylinder oriented so its axis is the truck's Z-axis (now local Y). */}
      <mesh>
        <cylinderGeometry
          args={[WHEEL.radius, WHEEL.radius, WHEEL.width, 28]}
        />
        <PaintedMaterial paint={wheelPaint} />
      </mesh>
      {/* Bearing inside the wheel, slightly wider so it pokes out both sides. */}
      <mesh>
        <cylinderGeometry
          args={[WHEEL.bearingR, WHEEL.bearingR, WHEEL.bearingW, 16]}
        />
        <meshStandardMaterial color="#1a1a22" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

// --- Main Deck component ----------------------------------------------------
export function Deck() {
  const selection = useSceneStore((s) => s.selection);
  const exploded = useSceneStore((s) => s.exploded);
  const rootRef = useRef<Group>(null);
  const boardRef = useRef<Group>(null);

  const deckPaint = useMemo(() => DECK_MATERIALS[selection.deck], [selection.deck]);
  const wheelPaint = useMemo(() => WHEEL_MATERIALS[selection.wheel], [selection.wheel]);
  const truckPaint = useMemo(() => TRUCK_MATERIALS[selection.truck], [selection.truck]);
  const gripPaint = useMemo(() => GRIP_MATERIALS[selection.grip], [selection.grip]);

  useFrame(() => {
    const root = rootRef.current;
    const board = boardRef.current;
    if (!root || !board) return;

    const state = useSceneStore.getState();
    const kf = getDeckKeyframe(state.activeSection, state.scrollProgress);

    // Root: section position + scale.
    root.position.x = MathUtils.lerp(root.position.x, kf.position[0], 0.08);
    root.position.y = MathUtils.lerp(root.position.y, kf.position[1], 0.08);
    root.position.z = MathUtils.lerp(root.position.z, kf.position[2], 0.08);
    const targetScale = kf.scale;
    root.scale.setScalar(
      MathUtils.lerp(root.scale.x, targetScale, 0.08),
    );

    // Rotation, animate at the inner board group so explode offsets are stable.
    board.rotation.x = MathUtils.lerp(board.rotation.x, kf.rotation[0], 0.07);
    board.rotation.y = MathUtils.lerp(board.rotation.y, kf.rotation[1], 0.07);
    board.rotation.z = MathUtils.lerp(board.rotation.z, kf.rotation[2], 0.07);

    // Idle float (hero only, keeps the deck feeling alive even at scroll 0).
    if (state.activeSection === 'hero') {
      const t = performance.now() * 0.001;
      board.position.y = Math.sin(t * 1.2) * 0.06;
    } else {
      board.position.y = MathUtils.lerp(board.position.y, 0, 0.1);
    }
  });

  // Board explode offset is local to the inner mesh.
  const boardYOffset = exploded ? EXPLODE_BOARD.y : 0;

  return (
    <group ref={rootRef}>
      <group ref={boardRef}>
        {/* Deck plate. */}
        <group position={[0, boardYOffset, 0]}>
          <RoundedBox
            args={[DECK.length, DECK.thickness, DECK.width]}
            radius={DECK.cornerRadius}
            smoothness={4}
            bevelSegments={3}
          >
            <PaintedMaterial paint={deckPaint} />
          </RoundedBox>

          {/* Underside accent stripe for graphic decks. */}
          {deckPaint.accent ? (
            <mesh position={[0, -DECK.thickness / 2 - 0.001, 0]}>
              <boxGeometry args={[DECK.length * 0.85, 0.005, DECK.width * 0.6]} />
              <meshStandardMaterial
                color={deckPaint.accent}
                metalness={deckPaint.metalness * 0.5}
                roughness={deckPaint.roughness}
                emissive={deckPaint.emissive ?? '#000000'}
                emissiveIntensity={(deckPaint.emissiveIntensity ?? 0) * 0.5}
              />
            </mesh>
          ) : null}

          {/* Grip tape on top. Two layers: base + accent stripe for tiger/topo. */}
          <RoundedBox
            args={[
              DECK.length - GRIP.inset,
              GRIP.thickness,
              DECK.width - GRIP.inset,
            ]}
            radius={DECK.cornerRadius * 0.85}
            smoothness={3}
            bevelSegments={2}
            position={[0, DECK.thickness / 2 + GRIP.thickness / 2, 0]}
          >
            <PaintedMaterial paint={gripPaint} />
          </RoundedBox>
          {gripPaint.accent ? (
            <mesh
              position={[
                0,
                DECK.thickness / 2 + GRIP.thickness + 0.001,
                0,
              ]}
            >
              <boxGeometry
                args={[
                  (DECK.length - GRIP.inset) * 0.7,
                  0.003,
                  (DECK.width - GRIP.inset) * 0.18,
                ]}
              />
              <meshStandardMaterial
                color={gripPaint.accent}
                roughness={gripPaint.roughness}
                metalness={gripPaint.metalness}
              />
            </mesh>
          ) : null}
        </group>

        {/* Trucks + wheels live under the board so they inherit the deck pose. */}
        <Truck
          isFront
          truckPaint={truckPaint}
          wheelPaint={wheelPaint}
          exploded={exploded}
        />
        <Truck
          isFront={false}
          truckPaint={truckPaint}
          wheelPaint={wheelPaint}
          exploded={exploded}
        />
      </group>
    </group>
  );
}
