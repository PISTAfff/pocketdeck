/**
 * Per-section camera and deck pose keyframes.
 *
 * The scroll controller smoothly damps the live camera/deck transforms toward
 * these targets each frame. Sections are arranged top-to-bottom of the page:
 *
 *   hero,         deck centered above the headline anchor (text sits below)
 *   manifesto,    deck pushed to the right so the pinned copy occupies the left
 *   anatomy,      deck swung to the right of the parts list
 *   configurator, deck on a turntable axis to the right of the swatch panel
 *   tricks,       deck out of frame; section runs on its own video grid
 *   order,        canvas faded, form renders against an opaque backdrop
 *
 * Numbers tuned for a procedural deck of dimensions roughly:
 *   deck:   width 1.6, length 5.4, thickness 0.12
 *   wheels at +/- 1.9, +/- 0.6, radius 0.25
 */
import type { SectionId } from '@/store/scene';

export interface CameraKeyframe {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface DeckKeyframe {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

/**
 * Per-section opacity for the persistent WebGL canvas.
 * The deck stays mounted (good for perf, never re-instantiates) but fades to
 * zero in sections that have no business showing 3D, so heavy copy / forms /
 * the footer can dominate without backdrops hiding the canvas.
 */
const SCENE_OPACITY: Record<SectionId, number> = {
  hero: 1,
  manifesto: 1,
  anatomy: 1,
  configurator: 1,
  tricks: 0,
  order: 0,
};

const CAMERA_KEYFRAMES: Record<SectionId, CameraKeyframe> = {
  hero: {
    position: [0, 1.2, 7.2],
    target: [0, 0.2, 0],
    fov: 32,
  },
  manifesto: {
    position: [-1.6, 0.8, 8.2],
    target: [1.4, 0, 0],
    fov: 34,
  },
  anatomy: {
    position: [-1.0, 3.6, 6.4],
    target: [1.4, 0, 0],
    fov: 30,
  },
  configurator: {
    position: [-1.2, 0.8, 5.4],
    target: [1.2, 0, 0],
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

/**
 * Deck scale is intentionally compact, the product is called PocketDeck.
 * Tuned so the model fits roughly in one column of the layout grid instead of
 * spanning the viewport.
 */
const DECK_KEYFRAMES: Record<SectionId, DeckKeyframe> = {
  hero: {
    position: [0.6, 0.15, 0],
    rotation: [-0.18, 0.45, 0.02],
    scale: 0.58,
  },
  manifesto: {
    // Pushed right so the pinned copy on the left half is uninterrupted.
    position: [1.7, 0.0, 0],
    rotation: [-0.05, 0.95, 0.18],
    scale: 0.6,
  },
  anatomy: {
    position: [1.6, 0, 0],
    rotation: [-Math.PI / 2 + 0.18, 0, 0],
    scale: 0.7,
  },
  configurator: {
    // Closer in but smaller so the model sits comfortably to the right of
    // the price panel, not on top of it.
    position: [1.4, 0, 0],
    rotation: [-0.25, 0, 0],
    scale: 0.78,
  },
  tricks: {
    position: [0, 0.4, 0],
    rotation: [-0.3, 0.6, 0],
    scale: 0.55,
  },
  order: {
    position: [0, 0, 0],
    rotation: [-0.1, 0.2, 0],
    scale: 0.55,
  },
};

export function getCameraKeyframe(section: SectionId): CameraKeyframe {
  return CAMERA_KEYFRAMES[section];
}

export function getSceneOpacity(section: SectionId): number {
  return SCENE_OPACITY[section];
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
      rotY += scrollProgress * 0.6;
      break;
    }
    case 'manifesto': {
      rotY += scrollProgress * Math.PI * 2;
      break;
    }
    case 'tricks': {
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
