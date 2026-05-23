/**
 * Per-section camera and deck pose keyframes.
 *
 * The scroll controller smoothly damps the live camera/deck transforms toward
 * these targets each frame. Sections are arranged top-to-bottom of the page:
 *
 *   hero       — deck floats centered, slight tilt, camera mid-distance
 *   manifesto  — deck angled, camera pushed back, drifts during scroll
 *   anatomy    — camera elevated, deck flat, parts ready to explode
 *   configurator — camera close, deck on a turntable axis
 *   tricks     — camera tracks while deck flips
 *   order      — deck settles flat, camera at hero distance for closing shot
 *
 * Numbers tuned for a procedural deck of dimensions roughly:
 *   deck:   width 1.6, length 5.4, thickness 0.12
 *   wheels at +/- 1.9, +/- 0.6, radius 0.25
 */
import type { SectionId } from '@/store/scene';

export interface CameraKeyframe {
  /** Camera world position. */
  position: [number, number, number];
  /** Look-at target (almost always origin or just above it). */
  target: [number, number, number];
  /** Camera field of view in degrees. */
  fov: number;
}

export interface DeckKeyframe {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

const CAMERA_KEYFRAMES: Record<SectionId, CameraKeyframe> = {
  hero: {
    position: [0, 1.4, 7.2],
    target: [0, 0, 0],
    fov: 32,
  },
  manifesto: {
    position: [3.6, 1.0, 8.5],
    target: [0, 0, 0],
    fov: 34,
  },
  anatomy: {
    position: [0, 4.2, 6.4],
    target: [0, 0, 0],
    fov: 30,
  },
  configurator: {
    position: [0, 1.0, 5.0],
    target: [0, 0, 0],
    fov: 28,
  },
  tricks: {
    position: [4.8, 0.6, 6.8],
    target: [0, 0, 0],
    fov: 36,
  },
  order: {
    position: [0, 1.4, 7.0],
    target: [0, 0, 0],
    fov: 30,
  },
};

const DECK_KEYFRAMES: Record<SectionId, DeckKeyframe> = {
  hero: {
    position: [0, 0.15, 0],
    rotation: [-0.18, 0.45, 0.02],
    scale: 1.0,
  },
  manifesto: {
    position: [-0.4, 0.0, 0],
    rotation: [-0.05, 0.95, 0.18],
    scale: 1.0,
  },
  anatomy: {
    position: [0, 0, 0],
    rotation: [-Math.PI / 2 + 0.18, 0, 0],
    scale: 1.05,
  },
  configurator: {
    position: [0, 0, 0],
    rotation: [-0.25, 0, 0],
    scale: 1.1,
  },
  tricks: {
    position: [0, 0.4, 0],
    rotation: [-0.3, 0.6, 0],
    scale: 1.0,
  },
  order: {
    position: [0, 0, 0],
    rotation: [-0.1, 0.2, 0],
    scale: 1.0,
  },
};

export function getCameraKeyframe(section: SectionId): CameraKeyframe {
  return CAMERA_KEYFRAMES[section];
}

export function getDeckKeyframe(
  section: SectionId,
  scrollProgress: number,
): DeckKeyframe {
  const base = DECK_KEYFRAMES[section];

  // Scroll-driven flourishes layered on top of the section target. Returned as a
  // fresh tuple so the caller can lerp toward it without mutating the constant.
  let rotX = base.rotation[0];
  let rotY = base.rotation[1];
  const rotZ = base.rotation[2];

  switch (section) {
    case 'hero': {
      // Slow idle spin.
      rotY += scrollProgress * 0.6;
      break;
    }
    case 'manifesto': {
      // Two barrel rolls across the manifesto section.
      rotY += scrollProgress * Math.PI * 2;
      break;
    }
    case 'tricks': {
      // Combine a kickflip (X) with a half shuvit (Y) loop.
      rotX -= scrollProgress * Math.PI * 2;
      rotY += scrollProgress * Math.PI;
      break;
    }
    default:
      break;
  }

  return {
    position: base.position,
    rotation: [rotX, rotY, rotZ],
    scale: base.scale,
  };
}
