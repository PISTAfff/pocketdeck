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
 * The deck geometry is a stripped-down version of Deck.tsx, same
 * dimension constants and material maps, but no exploded-view / no
 * keyframe-driven motion / no part dimming.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  OrbitControls,
  Environment,
} from '@react-three/drei';
import {
  CanvasTexture,
  Group,
  MathUtils,
  type PerspectiveCamera,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
} from 'three';
import { useSceneStore } from '@/store/scene';
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
  flatRatio: 0.6,
  kickRise: 2.4,
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
  offsetX: (5.4 * 0.6) / 2 - 0.05,
  dropY: -0.16,
  kingpinR: 0.025,
  kingpinH: 0.15,
  bushingR: 0.07,
  bushingH: 0.05,
};

/** See Deck.tsx for the rationale - builds a side-profile shape with
 * raised kicks at both ends, extruded to give the deck its width. */
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

const GRIP_THICKNESS = 0.022;
const GRIP_INSET_X = 0.1;
const GRIP_INSET_Z = 0.12;
const GRIP_LIFT = 0.001;

/** Mirror of buildGripShape in Deck.tsx - traces the deck's top
 * profile so the extruded grip layer bends across the kicks. */
function buildGripShape(): Shape {
  const shape = new Shape();
  const halfL = DECK.length / 2;
  const halfT = DECK.thickness / 2;
  const flatHalf = halfL * DECK.flatRatio;
  const kickTipY = halfT + DECK.thickness * DECK.kickRise * 0.5;
  const kickLen = halfL - flatHalf;
  const kickRise = kickTipY - halfT;
  const ratio = (kickLen - GRIP_INSET_X) / kickLen;
  const insetKickY = halfT + kickRise * Math.max(0, ratio);
  const insetKickX = halfL - GRIP_INSET_X;
  shape.moveTo(-insetKickX, insetKickY + GRIP_LIFT);
  shape.lineTo(-flatHalf, halfT + GRIP_LIFT);
  shape.lineTo(flatHalf, halfT + GRIP_LIFT);
  shape.lineTo(insetKickX, insetKickY + GRIP_LIFT);
  shape.lineTo(insetKickX, insetKickY + GRIP_LIFT + GRIP_THICKNESS);
  shape.lineTo(flatHalf, halfT + GRIP_LIFT + GRIP_THICKNESS);
  shape.lineTo(-flatHalf, halfT + GRIP_LIFT + GRIP_THICKNESS);
  shape.lineTo(-insetKickX, insetKickY + GRIP_LIFT + GRIP_THICKNESS);
  shape.closePath();
  return shape;
}

const GRIP_SHAPE = buildGripShape();
const WHEEL_DIM = {
  radius: 0.28,
  width: 0.22,
  offsetZ: 0.92,
  bearingR: 0.08,
  bearingW: 0.24,
};

function Mat({ paint, map }: { paint: MaterialPaint; map?: CanvasTexture }) {
  return (
    <meshStandardMaterial
      // When a texture map is provided (grip pattern), let the texture
      // color the surface; otherwise the paint color drives it.
      color={map ? '#ffffff' : paint.color}
      map={map}
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
      {/* Top bushing */}
      <mesh position={[0, -TRUCK.bushingH / 2, 0]}>
        <cylinderGeometry
          args={[TRUCK.bushingR, TRUCK.bushingR * 0.85, TRUCK.bushingH, 24]}
        />
        <meshStandardMaterial color="#1a1a22" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Hanger */}
      <mesh position={[0, -TRUCK.hangerH / 2 - TRUCK.bushingH, 0]}>
        <boxGeometry args={[TRUCK.hangerW, TRUCK.hangerH, TRUCK.hangerD]} />
        <Mat paint={truckPaint} />
      </mesh>
      {/* Kingpin */}
      <mesh position={[0, -TRUCK.kingpinH / 2 + 0.02, 0]}>
        <cylinderGeometry
          args={[TRUCK.kingpinR, TRUCK.kingpinR, TRUCK.kingpinH, 12]}
        />
        <meshStandardMaterial color="#9ea4ad" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* Bottom bushing */}
      <mesh position={[0, -TRUCK.hangerH - TRUCK.bushingH - TRUCK.bushingH / 2, 0]}>
        <cylinderGeometry
          args={[TRUCK.bushingR * 0.85, TRUCK.bushingR, TRUCK.bushingH, 24]}
        />
        <meshStandardMaterial color="#1a1a22" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Axle */}
      <mesh
        position={[0, -TRUCK.hangerH - TRUCK.bushingH, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[TRUCK.axleR, TRUCK.axleR, TRUCK.axleLen, 18]} />
        <Mat paint={truckPaint} />
      </mesh>
      {[1, -1].map((sign) => (
        <group
          key={sign}
          position={[0, -TRUCK.hangerH - TRUCK.bushingH, sign * WHEEL_DIM.offsetZ]}
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
  // Pattern baked into the grip's own material so it can't be hidden by
  // overlay-stacking issues. See Deck.tsx for the same approach.
  const gripTexture = useMemo(
    () => buildPatternTexture(selection.grip, gripPaint.color, gripPaint.accent ?? '#ededee'),
    [selection.grip, gripPaint.color, gripPaint.accent],
  );

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
        <Mat paint={deckPaint} />
      </mesh>
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
      {/* Grip: ExtrudeGeometry that conforms to the deck's kicks.
          See Deck.tsx for the same approach. */}
      <GripLayer paint={gripPaint} texture={gripTexture} />
      <Truck isFront truckPaint={truckPaint} wheelPaint={wheelPaint} />
      <Truck isFront={false} truckPaint={truckPaint} wheelPaint={wheelPaint} />
    </group>
  );
}

/**
 * Grip layer rendered as an ExtrudeGeometry sweep of the deck's TOP
 * profile, so the layer bends with the kicks instead of floating flat.
 * Same shape (GRIP_SHAPE) as Deck.tsx uses in the main scene.
 */
function GripLayer({
  paint,
  texture,
}: {
  paint: MaterialPaint;
  texture: CanvasTexture;
}) {
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
        metalness={paint.metalness}
        roughness={paint.roughness}
      />
    </mesh>
  );
}

/**
 * Build a Canvas2D pattern image at high resolution and wrap it as a
 * three.js CanvasTexture. The grip plane uses this as `map` so the
 * pattern is part of the surface itself; that way it can't be hidden by
 * geometry quirks, lighting flatness, or render-order races the way the
 * separate-mesh approach was. The texture's aspect (4:1) matches the
 * grip's length:width ratio so the dots stay round and the stripes stay
 * horizontal under the default UV mapping.
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

  // Solid base so the grip stays opaque and the pattern reads against it.
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accentColor;
  ctx.strokeStyle = accentColor;

  if (pattern === 'classic') {
    // Silicon-carbide grit, see Deck.tsx for the rationale.
    const grainCount = 1200;
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < grainCount; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 0.4 + rand() * 1.2;
      ctx.globalAlpha = 0.5 + rand() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'tiger') {
    // 5 horizontal stripes; widths picked so the center stripe is the
    // boldest. The texture's V axis maps to the deck's width direction.
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
    // topo: concentric ovals stacking out from the center. Stroked, not
    // filled, so the contour-map read holds.
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

interface OrderPreviewProps {
  expanded: boolean;
}

/**
 * Reactive camera sync — Canvas's `camera` prop only seeds the camera at
 * mount, so it can't respond to viewport changes mid-session. This child
 * lives inside the Canvas, reads the actual camera via useThree, and
 * writes fov / position whenever the inputs change. Used to pull the
 * camera back + widen the fov in the expanded preview on narrow viewports
 * where the deck would otherwise be cropped or sit huge in the frame.
 */
function ResponsiveCamera({
  expanded,
  narrow,
}: {
  expanded: boolean;
  narrow: boolean;
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useEffect(() => {
    if (expanded && narrow) {
      camera.position.set(0, 1.9, 9.4);
      camera.fov = 38;
    } else if (expanded) {
      camera.position.set(0, 1.5, 7.4);
      camera.fov = 26;
    } else {
      camera.position.set(0, 1.5, 7.4);
      camera.fov = 30;
    }
    camera.updateProjectionMatrix();
  }, [camera, expanded, narrow]);
  return null;
}

export function OrderPreview({ expanded }: OrderPreviewProps) {
  // Narrow viewport check — used to pick a wider FOV + pulled-back camera
  // for the expanded preview on phones. Read on mount, then track resizes
  // (a phone rotation flips landscape/portrait and we want the deck to
  // re-fit). Pre-mount the value is `false`, which matches the desktop
  // camera and is the right SSR default.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const update = () => setNarrow(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

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
        <ResponsiveCamera expanded={expanded} narrow={narrow} />
        <color attach="background" args={['#07070a']} />
        <fog attach="fog" args={['#07070a', 9, 22]} />

        {/* Base ambient + a sky/ground hemisphere so the deck never sits
            in pure-black silhouette. Bumped up across the board because
            the small-tile preview was reading too dim. */}
        <ambientLight intensity={expanded ? 0.75 : 0.85} />
        <hemisphereLight
          args={['#ffe6c4', '#ff5b14', expanded ? 0.65 : 0.8]}
        />

        {/* Warm key light, top-front. Bumped to "studio key" levels so
            the deck face catches a clean specular even in the small
            preview tile. */}
        <directionalLight
          position={[3, 4, 4]}
          intensity={expanded ? 1.6 : 1.7}
          color="#ffe6c4"
          castShadow={false}
        />

        {/* Cool back-rim so the silhouette reads against the dark room. */}
        <directionalLight
          position={[-4, 2, -2]}
          intensity={expanded ? 1 : 0.95}
          color="#88a5d6"
        />

        {/* Side fill from the right - small preview gets a stronger
            side wash so the trucks + wheels read clearly. */}
        <directionalLight
          position={[5, 1, 0]}
          intensity={expanded ? 0.55 : 0.8}
          color="#ffd9a8"
        />

        {/* Ember underglow from below for the brand accent. */}
        <pointLight
          position={[0, -1.6, 0]}
          intensity={expanded ? 1 : 1.1}
          color="#ff5b14"
          distance={9}
        />

        {/* Hot key spotlight from top-front, focused tight on the deck
            so a clear ember-tinted highlight rakes across the grip even
            during the slow rotation. The "light source" the user can
            actually see. */}
        <spotLight
          position={expanded ? [2, 5, 5] : [1.4, 3.4, 3.2]}
          angle={expanded ? 0.55 : 0.5}
          penumbra={expanded ? 0.6 : 0.55}
          intensity={expanded ? 1.6 : 1.7}
          color="#ffe6c4"
          distance={expanded ? 22 : 16}
        />

        {/* Secondary ember-tinted spotlight from the LEFT so the deck
            picks up two-tone highlights (warm key from the right, ember
            from the left) as it rotates under the auto-spin. */}
        <spotLight
          position={[-2.4, 2.8, 2.5]}
          angle={0.55}
          penumbra={0.7}
          intensity={expanded ? 0.8 : 1.1}
          color="#ff7d3a"
          distance={14}
        />

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
            // Lock the camera to a hemisphere above the deck (no upside-down
            // gymnastics; users can still look at it from the side).
            minPolarAngle={Math.PI * 0.18}
            maxPolarAngle={Math.PI * 0.82}
          />
        )}
      </Canvas>

      {/* Helper hint, only while expanded. Wording shifts on touch where
          there's no scroll wheel, and the pill is pushed up off the
          phone's bottom edge so the home-bar doesn't hide it. */}
      {expanded && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-ink-900/70 px-4 py-2 font-mono text-[10px] tracking-[0.24em] text-bone-200 uppercase ring-1 ring-bone-50/10 backdrop-blur sm:bottom-6 sm:tracking-[0.28em]">
          {narrow ? 'Drag · pinch · double-tap' : 'Drag to rotate · scroll to zoom'}
        </div>
      )}
    </div>
  );
}
