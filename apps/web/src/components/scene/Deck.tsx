'use client';

/**
 * Deck, the procedural fingerboard.
 *
 * Built entirely from three.js primitives (no GLTF). Hierarchy:
 *
 *   <group> deckRoot (animated by scroll keyframes)
 *     <group> board (RoundedBox deck plate + grip)
 *     <group> truckGroup (front + back trucks, each with wheels + bearings)
 *
 * Materials read from useSceneStore.selection so the configurator can
 * re-color in real time. When `highlightPart` is set on the store, the other
 * parts dim (color and emissive scaled down) so the active component pops.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Group, Vector3, MathUtils } from 'three';
import { useSceneStore, type DeckPart } from '@/store/scene';
import { getDeckKeyframe } from '@/lib/scene/keyframes';
import {
  DECK_MATERIALS,
  WHEEL_MATERIALS,
  TRUCK_MATERIALS,
  GRIP_MATERIALS,
  type MaterialPaint,
} from '@/lib/scene/materials';

const DECK = {
  length: 5.4,
  width: 1.6,
  thickness: 0.12,
  cornerRadius: 0.22,
};
const GRIP = {
  thickness: 0.02,
  inset: 0.06,
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
  offsetX: 1.85,
  dropY: -0.16,
};
const WHEEL = {
  radius: 0.28,
  width: 0.22,
  offsetZ: 0.92,
  bearingR: 0.08,
  bearingW: 0.24,
};

const EXPLODE_BOARD = new Vector3(0, 0.35, 0);
const EXPLODE_TRUCK_FRONT = new Vector3(0.9, -0.4, 0);
const EXPLODE_TRUCK_BACK = new Vector3(-0.9, -0.4, 0);
const EXPLODE_WHEEL = new Vector3(0, -0.2, 0.45);

/**
 * Opacity used for dimmed (non-highlighted) parts. Anatomy fades a little
 * harder than the configurator does (#26 sets the configurator floor at 0.4).
 */
const DIM_OPACITY_ANATOMY = 0.32;
const DIM_OPACITY_CONFIGURATOR = 0.4;
/** Emissive ember tint when a part is the active highlight in anatomy (#20). */
const GLOW_EMISSIVE = '#ff5b14';
const GLOW_INTENSITY = 0.55;

function applyDim(paint: MaterialPaint, dim: boolean): MaterialPaint {
  if (!dim) return paint;
  return {
    ...paint,
    color: paint.color,
    metalness: paint.metalness * 0.55,
    roughness: Math.min(1, paint.roughness + 0.15),
    emissive: paint.emissive ?? '#000000',
    emissiveIntensity: (paint.emissiveIntensity ?? 0) * 0.4,
  };
}

function applyGlow(paint: MaterialPaint, glow: boolean): MaterialPaint {
  if (!glow) return paint;
  // Stack our ember glow on top of any existing emissive in the paint.
  return {
    ...paint,
    emissive: GLOW_EMISSIVE,
    emissiveIntensity: (paint.emissiveIntensity ?? 0) + GLOW_INTENSITY,
  };
}

function PaintedMaterial({
  paint,
  dim,
  glow = false,
  dimOpacity = DIM_OPACITY_ANATOMY,
}: {
  paint: MaterialPaint;
  dim: boolean;
  glow?: boolean;
  /** Opacity for the dimmed state; varies by section. */
  dimOpacity?: number;
}) {
  const effective = applyGlow(applyDim(paint, dim), glow);
  // Keep `transparent` true at all times. Toggling it forces three.js to
  // recompile the material, which used to flash the previous color before
  // the new color landed (the "pick pink, see blue" issue). With opacity
  // alone driving the dim state, every color change is a pure uniform
  // update on the same material instance.
  return (
    <meshStandardMaterial
      color={effective.color}
      metalness={effective.metalness}
      roughness={effective.roughness}
      emissive={effective.emissive ?? '#000000'}
      emissiveIntensity={effective.emissiveIntensity ?? 0}
      transparent
      opacity={dim ? dimOpacity : 1}
    />
  );
}

interface TruckProps {
  isFront: boolean;
  truckPaint: MaterialPaint;
  wheelPaint: MaterialPaint;
  exploded: boolean;
  dimTruck: boolean;
  dimWheel: boolean;
  glowTruck: boolean;
  glowWheel: boolean;
  dimOpacity: number;
}

function Truck({
  isFront,
  truckPaint,
  wheelPaint,
  exploded,
  dimTruck,
  dimWheel,
  glowTruck,
  glowWheel,
  dimOpacity,
}: TruckProps) {
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
      <mesh position={[0, TRUCK.baseplateH / 2, 0]}>
        <boxGeometry
          args={[TRUCK.baseplateW, TRUCK.baseplateH, TRUCK.baseplateD]}
        />
        <PaintedMaterial paint={truckPaint} dim={dimTruck} glow={glowTruck} dimOpacity={dimOpacity} />
      </mesh>

      <mesh position={[0, -TRUCK.hangerH / 2, 0]}>
        <boxGeometry args={[TRUCK.hangerW, TRUCK.hangerH, TRUCK.hangerD]} />
        <PaintedMaterial paint={truckPaint} dim={dimTruck} glow={glowTruck} dimOpacity={dimOpacity} />
      </mesh>

      <mesh position={[0, -TRUCK.hangerH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[TRUCK.axleR, TRUCK.axleR, TRUCK.axleLen, 18]}
        />
        <PaintedMaterial paint={truckPaint} dim={dimTruck} glow={glowTruck} dimOpacity={dimOpacity} />
      </mesh>

      {[1, -1].map((sign) => (
        <Wheel
          key={sign}
          z={sign * WHEEL.offsetZ}
          y={-TRUCK.hangerH}
          wheelPaint={wheelPaint}
          exploded={exploded}
          explodeZ={sign * EXPLODE_WHEEL.z}
          dim={dimWheel}
          glow={glowWheel}
          dimOpacity={dimOpacity}
        />
      ))}
    </group>
  );
}

interface WheelProps {
  z: number;
  y: number;
  wheelPaint: MaterialPaint;
  exploded: boolean;
  explodeZ: number;
  dim: boolean;
  glow: boolean;
  dimOpacity: number;
}

function Wheel({
  z,
  y,
  wheelPaint,
  exploded,
  explodeZ,
  dim,
  glow,
  dimOpacity,
}: WheelProps) {
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
      <mesh>
        <cylinderGeometry
          args={[WHEEL.radius, WHEEL.radius, WHEEL.width, 28]}
        />
        <PaintedMaterial paint={wheelPaint} dim={dim} glow={glow} dimOpacity={dimOpacity} />
      </mesh>
      <mesh>
        <cylinderGeometry
          args={[WHEEL.bearingR, WHEEL.bearingR, WHEEL.bearingW, 16]}
        />
        <meshStandardMaterial
          color="#1a1a22"
          metalness={0.85}
          roughness={0.3}
          transparent
          opacity={dim ? dimOpacity : 1}
        />
      </mesh>
    </group>
  );
}

/**
 * Dimming runs in Anatomy (feature one part at a time) and in the
 * Configurator (highlight the axis currently being edited, #26). Other
 * sections show the full skate at full brightness.
 */
function isDimmed(
  section: string,
  highlight: DeckPart | null,
  part: DeckPart,
): boolean {
  if (section !== 'anatomy' && section !== 'configurator') return false;
  return highlight !== null && highlight !== part;
}

function dimOpacityFor(section: string): number {
  return section === 'configurator'
    ? DIM_OPACITY_CONFIGURATOR
    : DIM_OPACITY_ANATOMY;
}

export function Deck() {
  const selection = useSceneStore((s) => s.selection);
  const exploded = useSceneStore((s) => s.exploded);
  const highlightPart = useSceneStore((s) => s.highlightPart);
  const activeSection = useSceneStore((s) => s.activeSection);
  const rootRef = useRef<Group>(null);
  const boardRef = useRef<Group>(null);

  const deckPaint = useMemo(() => DECK_MATERIALS[selection.deck], [selection.deck]);
  const wheelPaint = useMemo(() => WHEEL_MATERIALS[selection.wheel], [selection.wheel]);
  const truckPaint = useMemo(() => TRUCK_MATERIALS[selection.truck], [selection.truck]);
  const gripPaint = useMemo(() => GRIP_MATERIALS[selection.grip], [selection.grip]);

  const dimDeck = isDimmed(activeSection, highlightPart, 'deck');
  const dimGrip = isDimmed(activeSection, highlightPart, 'grip');
  const dimTruck = isDimmed(activeSection, highlightPart, 'truck');
  const dimWheel = isDimmed(activeSection, highlightPart, 'wheel');

  // Glow the active part when a highlight is set (#20 in anatomy, #26 in
  // configurator). The non-active parts dim simultaneously.
  const glowing =
    (activeSection === 'anatomy' || activeSection === 'configurator') &&
    highlightPart !== null;
  const glowDeck = glowing && highlightPart === 'deck';
  const glowGrip = glowing && highlightPart === 'grip';
  const glowTruck = glowing && highlightPart === 'truck';
  const glowWheel = glowing && highlightPart === 'wheel';
  const dimOp = dimOpacityFor(activeSection);

  useFrame(() => {
    const root = rootRef.current;
    const board = boardRef.current;
    if (!root || !board) return;

    const state = useSceneStore.getState();
    const kf = getDeckKeyframe(
      state.activeSection,
      state.scrollProgress,
      state.highlightPart,
    );

    root.position.x = MathUtils.lerp(root.position.x, kf.position[0], 0.08);
    root.position.y = MathUtils.lerp(root.position.y, kf.position[1], 0.08);
    root.position.z = MathUtils.lerp(root.position.z, kf.position[2], 0.08);
    const targetScale = kf.scale;
    root.scale.setScalar(MathUtils.lerp(root.scale.x, targetScale, 0.08));

    board.rotation.x = MathUtils.lerp(board.rotation.x, kf.rotation[0], 0.07);
    board.rotation.y = MathUtils.lerp(board.rotation.y, kf.rotation[1], 0.07);
    board.rotation.z = MathUtils.lerp(board.rotation.z, kf.rotation[2], 0.07);

    if (state.activeSection === 'hero') {
      const t = performance.now() * 0.001;
      board.position.y = Math.sin(t * 1.2) * 0.06;
    } else {
      board.position.y = MathUtils.lerp(board.position.y, 0, 0.1);
    }
  });

  const boardYOffset = exploded ? EXPLODE_BOARD.y : 0;

  return (
    <group ref={rootRef}>
      <group ref={boardRef}>
        <group position={[0, boardYOffset, 0]}>
          {/* Deck plate */}
          <RoundedBox
            args={[DECK.length, DECK.thickness, DECK.width]}
            radius={DECK.cornerRadius}
            smoothness={4}
            bevelSegments={3}
          >
            <PaintedMaterial paint={deckPaint} dim={dimDeck} glow={glowDeck} />
          </RoundedBox>

          {deckPaint.accent ? (
            <mesh position={[0, -DECK.thickness / 2 - 0.001, 0]}>
              <boxGeometry args={[DECK.length * 0.85, 0.005, DECK.width * 0.6]} />
              <meshStandardMaterial
                color={deckPaint.accent}
                metalness={deckPaint.metalness * 0.5}
                roughness={deckPaint.roughness}
                emissive={deckPaint.emissive ?? '#000000'}
                emissiveIntensity={(deckPaint.emissiveIntensity ?? 0) * 0.5}
                transparent
                opacity={dimDeck ? dimOp : 1}
              />
            </mesh>
          ) : null}

          {/* Grip layer */}
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
            <PaintedMaterial paint={gripPaint} dim={dimGrip} glow={glowGrip} />
          </RoundedBox>
          {gripPaint.accent ? (
            <mesh
              position={[0, DECK.thickness / 2 + GRIP.thickness + 0.001, 0]}
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
                transparent
                opacity={dimGrip ? dimOp : 1}
              />
            </mesh>
          ) : null}
        </group>

        <Truck
          isFront
          truckPaint={truckPaint}
          wheelPaint={wheelPaint}
          exploded={exploded}
          dimTruck={dimTruck}
          dimWheel={dimWheel}
          glowTruck={glowTruck}
          glowWheel={glowWheel}
          dimOpacity={dimOp}
        />
        <Truck
          isFront={false}
          truckPaint={truckPaint}
          wheelPaint={wheelPaint}
          exploded={exploded}
          dimTruck={dimTruck}
          dimWheel={dimWheel}
          glowTruck={glowTruck}
          glowWheel={glowWheel}
          dimOpacity={dimOp}
        />
      </group>
    </group>
  );
}
