/**
 * Per-section camera and deck pose keyframes.
 *
 * The scroll controller smoothly damps the live camera/deck transforms toward
 * these targets each frame. Sections are arranged top-to-bottom of the page:
 *
 *   hero,         deck centered above the headline anchor (text sits below)
 *   manifesto,    deck pushed to the right so the pinned copy occupies the left
 *   anatomy,      deck swung to the right of the parts list, per-part sub-poses
 *   configurator, deck top-right of the viewport while the wizard takes left
 *   tricks,       deck out of frame; section runs on its own video grid
 *   order,        canvas faded, form renders against an opaque backdrop
 *
 * Numbers tuned for a procedural deck of dimensions roughly:
 *   deck:   width 1.6, length 5.4, thickness 0.12
 *   wheels at +/- 1.9, +/- 0.6, radius 0.25
 */
import type { SectionId, DeckPart } from '@/store/scene';

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
    // Default anatomy view; overridden per-part by ANATOMY_CAMERA below.
    position: [-1.0, 3.6, 6.4],
    target: [1.4, 0, 0],
    fov: 30,
  },
  configurator: {
    // Camera looks at world origin so the deck (positioned upper-right in
    // world space) appears in the upper-right of the screen.
    position: [0, 0.4, 6.4],
    target: [0, 0.3, 0],
    fov: 30,
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
    position: [2.0, 0.35, 0],
    rotation: [-0.18, 0.45, 0.02],
    scale: 0.55,
  },
  manifesto: {
    position: [1.7, 0.0, 0],
    rotation: [-0.05, 0.95, 0.18],
    scale: 0.6,
  },
  anatomy: {
    // Default anatomy pose; overridden per-part by ANATOMY_DECK below.
    position: [1.6, 0, 0],
    rotation: [-Math.PI / 2 + 0.18, 0, 0],
    scale: 0.7,
  },
  configurator: {
    // World-space upper-right position so the deck appears in the top-right
    // of the viewport. Camera looks at the world origin (see configurator
    // camera keyframe above), so the +X +Y offset translates directly to
    // screen position.
    position: [1.9, 1.0, 0],
    rotation: [-0.18, 0.35, 0],
    scale: 0.68,
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

/**
 * Per-anatomy-part overrides. Each step in the anatomy scroll-pin moves the
 * camera + deck into a pose that features that part. Bearings share the wheel
 * pose since they live inside the wheels.
 */
const ANATOMY_CAMERA: Record<DeckPart, CameraKeyframe> = {
  deck: {
    // High angle looking down on the deck plate.
    position: [-0.6, 4.0, 5.2],
    target: [1.6, 0, 0],
    fov: 28,
  },
  truck: {
    // Eye-level from the left, low angle to feature the trucks underneath.
    position: [-2.5, 0.4, 4.5],
    target: [1.6, -0.4, 0],
    fov: 26,
  },
  wheel: {
    // Close in from the side so a wheel is prominent.
    position: [-1.6, 0.2, 3.6],
    target: [2.4, -0.2, 0.4],
    fov: 24,
  },
  grip: {
    // Top-down centered on the grip-tape stripe.
    position: [-0.2, 4.6, 3.6],
    target: [1.6, 0, 0],
    fov: 26,
  },
};

const ANATOMY_DECK: Record<DeckPart, DeckKeyframe> = {
  deck: {
    position: [1.6, 0, 0],
    rotation: [-Math.PI / 2 + 0.18, 0, 0],
    scale: 0.78,
  },
  truck: {
    // Tilt up so the underside / trucks face the camera.
    position: [1.6, 0, 0],
    rotation: [-0.35, 0.05, 0],
    scale: 0.8,
  },
  wheel: {
    // Rotate so a wheel pair leads. Slightly canted on Z for dynamic feel.
    position: [1.6, 0, 0],
    rotation: [-0.25, 0.6, 0.05],
    scale: 0.82,
  },
  grip: {
    // Pure top-down; the grip is the top surface of the deck.
    position: [1.6, 0, 0],
    rotation: [-Math.PI / 2, 0, 0],
    scale: 0.78,
  },
};

export function getCameraKeyframe(
  section: SectionId,
  highlightPart: DeckPart | null,
): CameraKeyframe {
  if (section === 'anatomy' && highlightPart) {
    return ANATOMY_CAMERA[highlightPart];
  }
  return CAMERA_KEYFRAMES[section];
}

export function getSceneOpacity(section: SectionId): number {
  return SCENE_OPACITY[section];
}

export function getDeckKeyframe(
  section: SectionId,
  scrollProgress: number,
  highlightPart: DeckPart | null,
): DeckKeyframe {
  let base: DeckKeyframe;
  if (section === 'anatomy' && highlightPart) {
    base = ANATOMY_DECK[highlightPart];
  } else {
    base = DECK_KEYFRAMES[section];
  }

  // Scroll-driven flourishes layered on top. Returned as a fresh tuple so
  // the caller can lerp toward it without mutating the constant.
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
