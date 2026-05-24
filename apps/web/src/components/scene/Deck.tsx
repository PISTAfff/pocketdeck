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
import {
  CanvasTexture,
  Group,
  MathUtils,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector3,
} from 'three';
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
  // Skateboard silhouette: the middle 60% is flat, the outer ~20% on each
  // end curves UP into kicks. flatRatio defines how much of the deck is
  // flat top; kickRise is how high (in deck thicknesses) the tip of each
  // kick sits above the flat deck top.
  flatRatio: 0.6,
  kickRise: 2.4,
};

/**
 * Build a side-profile shape of the deck (in XY plane) with raised
 * kicks at both ends. ExtrudeGeometry then sweeps this profile along
 * the +Z axis to give the deck its width, producing a proper
 * skateboard silhouette - flat ride zone in the middle, curved-up
 * tail and nose.
 */
function buildDeckShape(): Shape {
  const shape = new Shape();
  const halfL = DECK.length / 2;
  const halfT = DECK.thickness / 2;
  const flatHalf = halfL * DECK.flatRatio;
  const kickTipY = halfT + DECK.thickness * DECK.kickRise * 0.5;

  // Bottom-left → bottom edge → bottom-right.
  shape.moveTo(-halfL, -halfT);
  shape.lineTo(halfL, -halfT);
  // Right kick: up to the raised tip, then down to where the flat top
  // begins. Two segments give a clean angular kick.
  shape.lineTo(halfL, kickTipY);
  shape.lineTo(flatHalf, halfT);
  // Flat top across the middle.
  shape.lineTo(-flatHalf, halfT);
  // Left kick: mirror of the right kick.
  shape.lineTo(-halfL, kickTipY);
  shape.lineTo(-halfL, -halfT);
  shape.closePath();
  return shape;
}

const DECK_SHAPE = buildDeckShape();

/**
 * Grip layer thickness and inset from the deck edges.
 *
 * The grip is built as an ExtrudeGeometry from a shape that mirrors the
 * deck's top contour (including the kicks), so it bends with the deck
 * rather than sitting as a flat slab over the curved tail/nose. Insets
 * keep the grip from poking past the deck's bevelled edges.
 */
const GRIP_THICKNESS = 0.022;
const GRIP_INSET_X = 0.1;
const GRIP_INSET_Z = 0.12;
/** Tiny vertical lift to avoid z-fighting with the deck plate's top face. */
const GRIP_LIFT = 0.001;

/**
 * Build a side-profile shape that traces the TOP surface of the deck
 * (flat middle + two kicks), with a small thickness above it. Extruded
 * along +Z this produces a thin grip layer that conforms to the deck's
 * kicks instead of floating flat over them.
 */
function buildGripShape(): Shape {
  const shape = new Shape();
  const halfL = DECK.length / 2;
  const halfT = DECK.thickness / 2;
  const flatHalf = halfL * DECK.flatRatio;
  const kickTipY = halfT + DECK.thickness * DECK.kickRise * 0.5;

  // The grip ends partway up the kick (inset). Find the Y coordinate at
  // the inset X so the lower edge of the grip stays flush with the
  // deck's kicked top all the way to the trim point.
  const kickLen = halfL - flatHalf;
  const kickRise = kickTipY - halfT;
  const ratio = (kickLen - GRIP_INSET_X) / kickLen;
  const insetKickY = halfT + kickRise * Math.max(0, ratio);
  const insetKickX = halfL - GRIP_INSET_X;

  // Lower boundary, traces the top of the deck (kick → flat → kick),
  // lifted by GRIP_LIFT so it doesn't z-fight with the deck plate face.
  shape.moveTo(-insetKickX, insetKickY + GRIP_LIFT);
  shape.lineTo(-flatHalf, halfT + GRIP_LIFT);
  shape.lineTo(flatHalf, halfT + GRIP_LIFT);
  shape.lineTo(insetKickX, insetKickY + GRIP_LIFT);
  // Upper boundary, parallel offset up by GRIP_THICKNESS.
  shape.lineTo(insetKickX, insetKickY + GRIP_LIFT + GRIP_THICKNESS);
  shape.lineTo(flatHalf, halfT + GRIP_LIFT + GRIP_THICKNESS);
  shape.lineTo(-flatHalf, halfT + GRIP_LIFT + GRIP_THICKNESS);
  shape.lineTo(-insetKickX, insetKickY + GRIP_LIFT + GRIP_THICKNESS);
  shape.closePath();
  return shape;
}

const GRIP_SHAPE = buildGripShape();
const TRUCK = {
  baseplateW: 1.0,
  baseplateD: 0.55,
  baseplateH: 0.08,
  hangerW: 1.7,
  hangerD: 0.32,
  hangerH: 0.18,
  axleLen: 2.1,
  axleR: 0.04,
  // Trucks sit at the inside edges of the flat middle (just where the
  // kicks start), matching how truck mounting plates sit on a real
  // skateboard.
  offsetX: (5.4 * 0.6) / 2 - 0.05,
  dropY: -0.16,
  // Kingpin: the vertical bolt that holds the hanger to the baseplate
  // via bushings. Visible from the side once the truck is detailed.
  kingpinR: 0.025,
  kingpinH: 0.15,
  bushingR: 0.07,
  bushingH: 0.05,
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
  map,
}: {
  paint: MaterialPaint;
  dim: boolean;
  glow?: boolean;
  /** Opacity for the dimmed state; varies by section. */
  dimOpacity?: number;
  /** Optional texture baked onto the surface, e.g. grip pattern. */
  map?: CanvasTexture;
}) {
  const effective = applyGlow(applyDim(paint, dim), glow);
  // Keep `transparent` true at all times. Toggling it forces three.js to
  // recompile the material, which used to flash the previous color before
  // the new color landed (the "pick pink, see blue" issue). With opacity
  // alone driving the dim state, every color change is a pure uniform
  // update on the same material instance.
  return (
    <meshStandardMaterial
      // When a texture map is provided (grip pattern), let the texture
      // color the surface; otherwise the paint color drives it.
      color={map ? '#ffffff' : effective.color}
      map={map}
      metalness={effective.metalness}
      roughness={effective.roughness}
      emissive={effective.emissive ?? '#000000'}
      emissiveIntensity={effective.emissiveIntensity ?? 0}
      transparent
      opacity={dim ? dimOpacity : 1}
    />
  );
}

/**
 * Build a Canvas2D pattern image at high resolution and wrap it as a
 * three.js CanvasTexture. Used by the grip-plane overlay below.
 *
 * Earlier waves tried to render the pattern as separate 3D bump meshes
 * (cylinders / boxes / toruses) above the grip surface. They were
 * invisible against the dark grip from many camera angles. A flat
 * textured plane is simpler, always shows the pattern from any angle,
 * and isn't subject to z-fighting / render-order races with the grip.
 */
function buildPatternTexture(
  pattern: 'classic' | 'tiger' | 'topo',
  baseColor: string,
  accentColor: string,
): CanvasTexture {
  const w = 2048;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accentColor;
  ctx.strokeStyle = accentColor;

  if (pattern === 'classic') {
    // Silicon-carbide grit. Many tiny specks at low contrast - the
    // surface reads as a textured dark grip from a distance and only
    // shows the individual grains when the camera is close. Mixed
    // sizes + small jitter break the synthetic grid feel.
    const grainCount = 1200;
    // Seeded RNG so the noise is identical between renders (otherwise
    // each pattern rebuild would shimmer when the wheel/truck colors
    // change but the grip stays the same).
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < grainCount; i++) {
      const x = rand() * w;
      const y = rand() * h;
      // Sizes 0.4..1.6 px - tight cluster around 1 - so the surface
      // reads as fine grit rather than visible polka dots.
      const r = 0.4 + rand() * 1.2;
      ctx.globalAlpha = 0.5 + rand() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'tiger') {
    const stripes = [
      { y: 0.14, h: 0.08 },
      { y: 0.32, h: 0.10 },
      { y: 0.5, h: 0.14 },
      { y: 0.68, h: 0.10 },
      { y: 0.86, h: 0.08 },
    ];
    stripes.forEach((s) => {
      ctx.fillRect(0, (s.y - s.h / 2) * h, w, s.h * h);
    });
  } else {
    // topo: concentric ovals, contour-map style.
    ctx.lineWidth = 24;
    const cx = w / 2;
    const cy = h / 2;
    const rs = [0.1, 0.22, 0.36, 0.5, 0.66, 0.84, 1.04];
    rs.forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * w * 0.45, s * h * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
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
  /** True when the bearings (wheel core) is the active anatomy highlight.
   * The wheel cylinder stays neutral; the dark bearing center glows ember. */
  glowBearing: boolean;
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
  glowBearing,
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
      {/* Baseplate: bolts to the underside of the deck. */}
      <mesh position={[0, TRUCK.baseplateH / 2, 0]}>
        <boxGeometry
          args={[TRUCK.baseplateW, TRUCK.baseplateH, TRUCK.baseplateD]}
        />
        <PaintedMaterial paint={truckPaint} dim={dimTruck} glow={glowTruck} dimOpacity={dimOpacity} />
      </mesh>

      {/* Top bushing: rubber donut between baseplate and hanger. */}
      <mesh position={[0, -TRUCK.bushingH / 2, 0]}>
        <cylinderGeometry
          args={[TRUCK.bushingR, TRUCK.bushingR * 0.85, TRUCK.bushingH, 24]}
        />
        <meshStandardMaterial
          color="#1a1a22"
          roughness={0.9}
          metalness={0.05}
          transparent
          opacity={dimTruck ? dimOpacity : 1}
        />
      </mesh>

      {/* Hanger: the main aluminum body holding the axle. */}
      <mesh position={[0, -TRUCK.hangerH / 2 - TRUCK.bushingH, 0]}>
        <boxGeometry args={[TRUCK.hangerW, TRUCK.hangerH, TRUCK.hangerD]} />
        <PaintedMaterial paint={truckPaint} dim={dimTruck} glow={glowTruck} dimOpacity={dimOpacity} />
      </mesh>

      {/* Kingpin: vertical bolt through the hanger/baseplate, visible
          from the side. */}
      <mesh position={[0, -TRUCK.kingpinH / 2 + 0.02, 0]}>
        <cylinderGeometry
          args={[TRUCK.kingpinR, TRUCK.kingpinR, TRUCK.kingpinH, 12]}
        />
        <meshStandardMaterial
          color="#9ea4ad"
          metalness={0.9}
          roughness={0.25}
          transparent
          opacity={dimTruck ? dimOpacity : 1}
        />
      </mesh>

      {/* Bottom bushing: between hanger and the bottom of the baseplate
          assembly (showing on the bottom side of the hanger). */}
      <mesh position={[0, -TRUCK.hangerH - TRUCK.bushingH - TRUCK.bushingH / 2, 0]}>
        <cylinderGeometry
          args={[TRUCK.bushingR * 0.85, TRUCK.bushingR, TRUCK.bushingH, 24]}
        />
        <meshStandardMaterial
          color="#1a1a22"
          roughness={0.9}
          metalness={0.05}
          transparent
          opacity={dimTruck ? dimOpacity : 1}
        />
      </mesh>

      {/* Axle: the rod the wheels turn on. */}
      <mesh
        position={[0, -TRUCK.hangerH - TRUCK.bushingH, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry
          args={[TRUCK.axleR, TRUCK.axleR, TRUCK.axleLen, 18]}
        />
        <PaintedMaterial paint={truckPaint} dim={dimTruck} glow={glowTruck} dimOpacity={dimOpacity} />
      </mesh>

      {[1, -1].map((sign) => (
        <Wheel
          key={sign}
          z={sign * WHEEL.offsetZ}
          y={-TRUCK.hangerH - TRUCK.bushingH}
          wheelPaint={wheelPaint}
          exploded={exploded}
          explodeZ={sign * EXPLODE_WHEEL.z}
          dim={dimWheel}
          glow={glowWheel}
          glowBearing={glowBearing}
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
  /** Ember emissive on the bearing core mesh (the dark cylinder inside the
   * wheel) so the bearings anatomy step has a clear visual subject. */
  glowBearing: boolean;
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
  glowBearing,
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
      {/* Bearing core - bumped slightly outward on its rotation axis when
          highlighted so the ember glow isn't buried inside the wheel. */}
      <mesh scale={glowBearing ? [1.18, 1.06, 1.18] : 1}>
        <cylinderGeometry
          args={[WHEEL.bearingR, WHEEL.bearingR, WHEEL.bearingW, 16]}
        />
        <meshStandardMaterial
          color={glowBearing ? '#3a2a1a' : '#1a1a22'}
          metalness={0.85}
          roughness={0.3}
          emissive={glowBearing ? GLOW_EMISSIVE : '#000000'}
          emissiveIntensity={glowBearing ? GLOW_INTENSITY + 0.4 : 0}
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
 *
 * 'bearings' is an anatomy-only zoom into the wheel core, so for the
 * dim/glow visual it counts as targeting the wheel - the bearing IS
 * physically the center of the wheel, and dimming everything except
 * 'bearings' would dim the wheel itself, which is wrong.
 */
function effectiveTarget(highlight: DeckPart | null): DeckPart | null {
  if (highlight === 'bearings') return 'wheel';
  return highlight;
}

function isDimmed(
  section: string,
  highlight: DeckPart | null,
  part: DeckPart,
): boolean {
  if (section !== 'anatomy' && section !== 'configurator') return false;
  const target = effectiveTarget(highlight);
  return target !== null && target !== part;
}

function dimOpacityFor(section: string): number {
  return section === 'configurator'
    ? DIM_OPACITY_CONFIGURATOR
    : DIM_OPACITY_ANATOMY;
}

/**
 * Grip layer rendered as an ExtrudeGeometry sweep of the deck's TOP
 * profile. The shape (built in buildGripShape above) traces the deck's
 * kick-flat-kick top contour and adds a thin upward offset, so the
 * resulting mesh follows the kicks instead of floating as a flat slab
 * over them. Extruded along +Z to give the layer the deck's width.
 *
 * The pattern texture maps onto the entire mesh - that includes the
 * top surface (visible), the bottom (hidden against the deck), and the
 * tiny side caps. The visible result is grip tape that bends across
 * the kicks the way real silicon-carbide tape does after it's pressed
 * into the board.
 */
function GripLayer({
  paint,
  texture,
  glow,
  dim,
  dimOpacity,
}: {
  paint: MaterialPaint;
  texture: CanvasTexture;
  glow: boolean;
  dim: boolean;
  dimOpacity: number;
}) {
  const effective = glow
    ? {
        ...paint,
        emissive: GLOW_EMISSIVE,
        emissiveIntensity: (paint.emissiveIntensity ?? 0) + GLOW_INTENSITY,
      }
    : paint;
  const opacity = dim ? Math.max(0.7, dimOpacity) : 1;
  const depth = DECK.width - GRIP_INSET_Z * 2;

  return (
    <mesh position={[0, 0, -depth / 2]}>
      <extrudeGeometry
        args={[
          GRIP_SHAPE,
          {
            depth,
            bevelEnabled: true,
            bevelThickness: 0.004,
            bevelSize: 0.004,
            bevelOffset: 0,
            bevelSegments: 1,
            curveSegments: 1,
          },
        ]}
      />
      <meshStandardMaterial
        map={texture}
        color="#ffffff"
        metalness={effective.metalness}
        roughness={effective.roughness}
        emissive={effective.emissive ?? '#000000'}
        emissiveIntensity={effective.emissiveIntensity ?? 0}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
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
  // The grip pattern is rendered as a texture map on the grip RoundedBox
  // itself. An earlier wave tried a separate overlay plane that ended up
  // hidden under the grip box's rounded geometry; baking the pattern into
  // the grip surface guarantees it shows from any angle.
  const gripTexture = useMemo(
    () => buildPatternTexture(selection.grip, gripPaint.color, gripPaint.accent ?? '#ededee'),
    [selection.grip, gripPaint.color, gripPaint.accent],
  );

  const dimDeck = isDimmed(activeSection, highlightPart, 'deck');
  const dimGrip = isDimmed(activeSection, highlightPart, 'grip');
  const dimTruck = isDimmed(activeSection, highlightPart, 'truck');
  const dimWheel = isDimmed(activeSection, highlightPart, 'wheel');

  // Ember emissive glow on the active part. ONLY enabled in Anatomy where
  // the goal is to showcase the part being described and the user isn't
  // judging its color. In the Configurator we keep emissive off so dark
  // picks (Noir #0b0b0d, Midnight #1f2238, Gunmetal #3a3d44) read at
  // their true base color instead of being washed into ember.
  const glowing = activeSection === 'anatomy' && highlightPart !== null;
  // Glow targets the SPECIFIC highlighted part. The bearings step lights
  // up the bearing core (inside the wheel) rather than the wheel itself,
  // so the visual subject changes step-to-step.
  const glowDeck = glowing && highlightPart === 'deck';
  const glowGrip = glowing && highlightPart === 'grip';
  const glowTruck = glowing && highlightPart === 'truck';
  const glowWheel = glowing && highlightPart === 'wheel';
  // Bearings also glow in the Configurator's bearings step, since the
  // camera/dim there matches the wheel step and the glow is the only
  // visual cue that the step is about the inner bearing rather than the
  // outer wheel urethane.
  const glowBearing =
    (glowing && highlightPart === 'bearings') ||
    (activeSection === 'configurator' && highlightPart === 'bearings');
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
      state.anatomyProgress,
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
          {/* Deck plate. ExtrudeGeometry sweeps the side-profile shape
              (with kicks) along +Z to give it width. Position offsets
              so the extruded volume is centered on the deck's Z axis. */}
          <mesh position={[0, 0, -DECK.width / 2]}>
            <extrudeGeometry
              args={[
                DECK_SHAPE,
                {
                  depth: DECK.width,
                  bevelEnabled: true,
                  bevelThickness: 0.018,
                  bevelSize: 0.018,
                  bevelOffset: 0,
                  bevelSegments: 2,
                  curveSegments: 12,
                },
              ]}
            />
            <PaintedMaterial paint={deckPaint} dim={dimDeck} glow={glowDeck} />
          </mesh>

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

          {/* Grip layer. An ExtrudeGeometry whose profile traces the
              top of the deck (flat middle + two kicks) and adds a thin
              upward offset, swept along +Z. The mesh therefore bends
              with the deck's kicks the way real grip tape does after
              being pressed onto the board - no flat slab floating over
              the curved nose / tail. */}
          <GripLayer
            paint={gripPaint}
            texture={gripTexture}
            glow={glowGrip}
            dim={dimGrip}
            dimOpacity={dimOp}
          />
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
          glowBearing={glowBearing}
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
          glowBearing={glowBearing}
          dimOpacity={dimOp}
        />
      </group>
    </group>
  );
}
