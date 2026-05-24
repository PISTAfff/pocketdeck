'use client';

/**
 * BigDeckBackdrop, the giant 3D skate that sits behind the package cards.
 *
 * Top-down camera so the user sees the deck's top face filling the
 * column, with the long axis running vertically. The deck is STATIC -
 * no rotation, no wobble - it's a stage for the cards that sit on top
 * of it. Self-contained lighting (ambient + warm key + cool back-rim
 * + ember underglow) so nothing here drifts with scroll.
 */
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Shape } from 'three';

const DECK = {
  length: 5.4,
  width: 1.6,
  thickness: 0.12,
  flatRatio: 0.6,
  kickRise: 2.4,
};

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

function BigDeck() {
  // Rotated 90° around Y so the deck's long axis runs along world Z.
  // With the camera's up = +Z, world Z = screen-vertical, so the deck
  // ends up oriented VERTICALLY on screen (kicks at top + bottom of
  // the column). Matches the user's reference and fits the tall
  // column much better than the horizontal layout did.
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      {/* Deck plate - mid-grey so it reads as a real object behind the
          translucent cards. The brand still leans dark, but a pure
          near-black deck disappears against the ink-950 page. */}
      <mesh position={[0, 0, -DECK.width / 2]}>
        <extrudeGeometry
          args={[
            DECK_SHAPE,
            {
              depth: DECK.width,
              bevelEnabled: true,
              bevelThickness: 0.025,
              bevelSize: 0.025,
              bevelSegments: 2,
              curveSegments: 12,
            },
          ]}
        />
        <meshStandardMaterial
          color="#3a3a44"
          metalness={0.6}
          roughness={0.3}
          emissive="#1a1a22"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Grip top layer - darker than the deck plate so the top face
          reads as "this is the grip side facing the camera". A bit
          metallic so the directional lights leave visible streaks. */}
      <mesh position={[0, DECK.thickness / 2 + 0.012, 0]}>
        <boxGeometry args={[DECK.length * 0.92, 0.022, DECK.width * 0.78]} />
        <meshStandardMaterial
          color="#1f1f28"
          metalness={0.15}
          roughness={0.7}
        />
      </mesh>

      {/* Ember accent stripe down the center of the deck - a touch of
          the brand color so the deck reads at a glance even when partly
          covered by the cards. */}
      <mesh position={[0, DECK.thickness / 2 + 0.025, 0]}>
        <boxGeometry args={[DECK.length * 0.84, 0.001, DECK.width * 0.08]} />
        <meshStandardMaterial
          color="#ff5b14"
          emissive="#ff5b14"
          emissiveIntensity={0.6}
          metalness={0.2}
          roughness={0.5}
        />
      </mesh>

      {/* Trucks + wheels underneath, peeking around the deck silhouette. */}
      {[1, -1].map((sign) => (
        <group key={sign} position={[sign * 1.6, -0.24, 0]}>
          <mesh>
            <boxGeometry args={[0.95, 0.1, 0.55]} />
            <meshStandardMaterial color="#bcc0c5" metalness={0.65} roughness={0.35} />
          </mesh>
          <mesh
            position={[0, -0.2, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.045, 0.045, 2.05, 14]} />
            <meshStandardMaterial color="#bcc0c5" metalness={0.65} roughness={0.35} />
          </mesh>
          {[1, -1].map((s2) => (
            <group
              key={s2}
              position={[0, -0.2, s2 * 0.9]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <mesh>
                <cylinderGeometry args={[0.3, 0.3, 0.24, 22]} />
                <meshStandardMaterial color="#efe6d6" metalness={0.06} roughness={0.5} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.09, 0.09, 0.25, 14]} />
                <meshStandardMaterial color="#1a1a22" metalness={0.85} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

export function BigDeckBackdrop() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      // Deck is static so we only need to render when something else
      // forces a re-render. Keep frameloop on always for now in dev so
      // lighting changes (e.g. theme tweaks) take effect; production
      // could swap to 'demand' for a tiny GPU win.
      frameloop="always"
      // Camera looks STRAIGHT DOWN at the origin. up=+Z makes world
      // +Z the screen's vertical axis. The deck is rotated so its
      // long axis runs along world Z (above), so the deck reads
      // VERTICALLY on screen. Distance/fov tuned so the deck's full
      // length (5.4) almost fills the column height - kicks just
      // inside top + bottom edges.
      camera={{
        position: [0, 7.6, 0],
        fov: 42,
        near: 0.1,
        far: 30,
        up: [0, 0, 1],
      }}
      onCreated={({ camera }) => {
        // Re-apply up + lookAt in case R3F's camera prop didn't pick it
        // up cleanly (some versions ignore `up` from the descriptor).
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.85} />
      {/* Hemisphere light so the top face catches a sky/ground gradient
          (warm bone above, ember below). Top-down camera means the
          deck's flat top would be near-monochrome without this. */}
      <hemisphereLight
        args={['#ffe6c4', '#ff5b14', 1.1]}
      />
      {/* Strong top-front key so the grip face is clearly lit. */}
      <directionalLight
        position={[2, 6, 4]}
        intensity={1.6}
        color="#ffe6c4"
      />
      {/* Cool back-rim so the silhouette pops against ink-950 */}
      <directionalLight
        position={[-3, 4, -3]}
        intensity={0.75}
        color="#88a5d6"
      />
      {/* Side fill so the deck edges read */}
      <directionalLight
        position={[5, 2, 0]}
        intensity={0.5}
        color="#ffd9a8"
      />
      {/* Brand ember underglow */}
      <pointLight
        position={[0, 1.5, 0]}
        intensity={1.2}
        color="#ff5b14"
        distance={10}
      />
      <Suspense fallback={null}>
        <BigDeck />
      </Suspense>
    </Canvas>
  );
}
