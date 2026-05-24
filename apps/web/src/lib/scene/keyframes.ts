/**
 * Per-section camera and deck pose keyframes.
 *
 * The scroll controller smoothly damps the live camera/deck transforms toward
 * these targets each frame. Sections are arranged top-to-bottom of the page:
 *
 *   hero,         deck centered above the headline anchor (text sits below)
 *   manifesto,    deck pushed to the right so the pinned copy occupies the left
 *   anatomy,      deck swung to the right of the parts list, per-part sub-poses
 *   tricks,       deck out of frame; section runs on its own video grid
 *   configurator, deck top-right of the viewport while the wizard takes left
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
  // Manifesto frames the deck as a faded background element (#16).
  manifesto: 0.3,
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
    // Camera pulled back enough that the deck (positioned upper-right in
    // world space) fits entirely inside the visible frame. Looking at the
    // world origin means a positive +X +Y world offset maps to upper-right
    // on screen.
    position: [0, 0.4, 7.4],
    target: [0, 0.3, 0],
    fov: 28,
  },
  // Tricks holds the LAST anatomy camera pose (grip / near-overhead) so
  // the canvas doesn't visibly pan as the anatomy section exits and the
  // canvas fades out. The user perceives the 3D view as "frozen" on the
  // last anatomy frame rather than snapping toward the next section.
  tricks: {
    position: [0.1, 4.6, 0.5],
    target: [0.1, 0, 0],
    fov: 28,
  },
  order: {
    position: [0, 0.4, 7.4],
    target: [0, 0.3, 0],
    fov: 28,
  },
};

const DECK_KEYFRAMES: Record<SectionId, DeckKeyframe> = {
  hero: {
    // Bottom-right of the viewport (#10). Negative Y drops the model below
    // center; positive X keeps it in the right column so the headline on
    // the left never gets clipped by the wheels.
    position: [1.7, -0.55, 0],
    rotation: [-0.3, 0.55, 0.04],
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
    // World-space upper-right position so the deck reads in the top-right
    // of the viewport while the wizard UI takes left + bottom. Constrained
    // so the wheels never crop on the right edge (#27).
    position: [1.5, 0.85, 0],
    rotation: [-0.18, 0.42, 0],
    scale: 0.55,
  },
  // Tricks holds the LAST anatomy deck pose (grip - flat board, scale
  // 0.4, pushed right) so when the user scrolls out of anatomy the deck
  // doesn't drift toward a different pose while the canvas fades to 0.
  // The user perceives the 3D view as held on the final anatomy frame.
  tricks: {
    position: [1.2, 0, 0],
    rotation: [0, 0, 0],
    scale: 0.4,
  },
  order: {
    position: [1.5, 0.85, 0],
    rotation: [-0.18, 0.42, 0],
    scale: 0.55,
  },
};

/**
 * Per-anatomy-part overrides. Each step in the anatomy scroll-pin moves the
 * camera + deck into a pose that features that part without the chaos of
 * exploded geometry.
 *
 * The deck position stays world-space upper-right while the camera looks at
 * (or just-past) the world origin, so the deck reads as the right-column
 * subject of the shot and the headline / part copy on the left half of the
 * page never collides with it. Scale stays small (0.42 to 0.5) so the model
 * fits comfortably inside the right column.
 */
const ANATOMY_CAMERA: Record<DeckPart, CameraKeyframe> = {
  deck: {
    // Looking down from above with a slight forward tilt; deck reads flat.
    position: [-0.4, 3.6, 4.6],
    target: [0.2, 0.1, 0],
    fov: 26,
  },
  truck: {
    // Low side-on so the trucks underneath the board face the camera.
    position: [-2.4, 0.4, 3.8],
    target: [0.3, -0.1, 0],
    fov: 24,
  },
  wheel: {
    // Pulled in close, deck angled so a wheel pair leads the frame.
    position: [-1.3, 0.4, 3.0],
    target: [0.5, 0, 0],
    fov: 22,
  },
  grip: {
    // Near-overhead. Look-at offset to the left so the deck (at X=1.2)
    // reads in the right column. Tiny Z offset keeps the up vector
    // unambiguous (a true straight-down shot is degenerate with up=Y).
    position: [0.1, 4.6, 0.5],
    target: [0.1, 0, 0],
    fov: 28,
  },
  bearings: {
    // Same framing as the configurator's wheel/bearings step (and the
    // anatomy wheel pose): a side-on view so the wheel + visible
    // bearing core both read at a useful size. The earlier macro
    // close-up framed in too tight - the user lost the bearing as a
    // recognizable component.
    position: [-1.3, 0.4, 3.0],
    target: [0.5, 0, 0],
    fov: 22,
  },
};

/**
 * Per-step overrides for the Configure wizard. Same idea as ANATOMY_*: when
 * the active wizard step's highlightPart is set, the camera and deck pose
 * shift so the active component is the subject of the frame.
 *
 * The deck stays in the right column of the layout (X = 1.5) and the
 * camera looks slightly to the left of the deck (target near origin) so
 * perspective pushes the deck into the right half of the viewport, leaving
 * the left + bottom of the page clear for the wizard card and controls.
 */
const CONFIGURATOR_CAMERA: Record<DeckPart, CameraKeyframe> = {
  deck: {
    position: [-0.6, 3.8, 4.8],
    target: [0.3, 0.2, 0],
    fov: 26,
  },
  wheel: {
    position: [-1.4, 0.4, 3.0],
    target: [0.6, -0.1, 0.3],
    fov: 22,
  },
  truck: {
    position: [-2.2, 0.5, 3.8],
    target: [0.4, -0.25, 0],
    fov: 24,
  },
  grip: {
    // Near-overhead so the grip face fills the frame and the pattern is
    // the subject. Look-at sits LEFT of the deck (X=0.4) so perspective
    // offsets the deck (at X=1.6) into the right half of the viewport,
    // away from the wizard card on the left.
    position: [0.4, 5.0, 0.6],
    target: [0.4, 0, 0],
    fov: 30,
  },
  // Configurator never targets 'bearings' (no axis for it). Aliased to
  // the wheel pose to satisfy the Record<DeckPart, ...> type.
  bearings: {
    position: [-1.4, 0.4, 3.0],
    target: [0.6, -0.1, 0.3],
    fov: 22,
  },
};

const CONFIGURATOR_DECK: Record<DeckPart, DeckKeyframe> = {
  deck: {
    // Slight downward tilt so the deck plate face (with its accent stripe
    // visible through the side bevel) reads cleanly from above. Was
    // rotated -PI/2 which tipped the board on its long edge.
    position: [1.5, 0, 0],
    rotation: [0.25, 0, 0],
    scale: 0.45,
  },
  wheel: {
    position: [1.5, 0, 0],
    rotation: [-0.2, 0.6, 0.04],
    scale: 0.5,
  },
  truck: {
    position: [1.5, 0, 0],
    rotation: [-0.46, 0.15, 0],
    scale: 0.5,
  },
  grip: {
    // Deck stays flat (grip face up toward the overhead camera). Pushed
    // further right so the model offsets visibly to the right column
    // and doesn't lap over the wizard card.
    position: [1.6, 0, 0],
    rotation: [0, 0, 0],
    scale: 0.42,
  },
  bearings: {
    position: [1.5, 0, 0],
    rotation: [-0.2, 0.6, 0.04],
    scale: 0.5,
  },
};

const ANATOMY_DECK: Record<DeckPart, DeckKeyframe> = {
  // Scales kept under ~0.4 so the deck's projected width stays inside the
  // right column (~45vw, #18). Position X is also reduced so the wheels
  // never cross the centerline into the headline / spec column on the left.
  deck: {
    position: [1.1, 0, 0],
    // Slight forward tilt instead of -PI/2 (which tipped the board onto
    // its long edge). Grip face is mostly toward the camera at high +Y.
    rotation: [0.25, 0, 0],
    scale: 0.38,
  },
  truck: {
    position: [1.1, 0, 0],
    rotation: [-0.42, 0.12, 0],
    scale: 0.42,
  },
  wheel: {
    position: [1.1, 0, 0],
    rotation: [-0.2, 0.55, 0.04],
    scale: 0.42,
  },
  grip: {
    // Flat deck pushed further right so the grip surface lands in the
    // anatomy right column, away from the parts copy on the left.
    position: [1.2, 0, 0],
    rotation: [0, 0, 0],
    scale: 0.4,
  },
  bearings: {
    // Match the wheel anatomy pose - the bearings step shares the
    // wheel's side-on framing, just with the description copy + step
    // counter changed. The wheel + bearing center both stay in view.
    position: [1.1, 0, 0],
    rotation: [-0.2, 0.55, 0.04],
    scale: 0.42,
  },
};

/**
 * Order of anatomy parts as the user scrolls through the section, matching
 * the PARTS array in AnatomySection.tsx. The anatomyProgress value (0..4)
 * indexes into this array: integer part picks the "from" keyframe, decimal
 * picks the blend toward the next entry.
 */
const ANATOMY_PART_ORDER: readonly DeckPart[] = [
  'deck',
  'truck',
  'wheel',
  'bearings',
  'grip',
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpCamera(a: CameraKeyframe, b: CameraKeyframe, t: number): CameraKeyframe {
  return {
    position: [
      lerp(a.position[0], b.position[0], t),
      lerp(a.position[1], b.position[1], t),
      lerp(a.position[2], b.position[2], t),
    ],
    target: [
      lerp(a.target[0], b.target[0], t),
      lerp(a.target[1], b.target[1], t),
      lerp(a.target[2], b.target[2], t),
    ],
    fov: lerp(a.fov, b.fov, t),
  };
}

function lerpDeck(a: DeckKeyframe, b: DeckKeyframe, t: number): DeckKeyframe {
  return {
    position: [
      lerp(a.position[0], b.position[0], t),
      lerp(a.position[1], b.position[1], t),
      lerp(a.position[2], b.position[2], t),
    ],
    rotation: [
      lerp(a.rotation[0], b.rotation[0], t),
      lerp(a.rotation[1], b.rotation[1], t),
      lerp(a.rotation[2], b.rotation[2], t),
    ],
    scale: lerp(a.scale, b.scale, t),
  };
}

/**
 * Blend between two anatomy keyframes based on a continuous progress
 * value (0..ANATOMY_PART_ORDER.length-1). The integer floor picks the
 * "from" part, the fractional part picks the lerp factor toward the next.
 * Out-of-range values clamp to the endpoints (so when the user has
 * scrolled past the section, the pose holds at the last part).
 */
function interpolateAnatomyCamera(progress: number): CameraKeyframe {
  const max = ANATOMY_PART_ORDER.length - 1;
  const clamped = Math.max(0, Math.min(max, progress));
  const i = Math.floor(clamped);
  const t = clamped - i;
  const a = ANATOMY_CAMERA[ANATOMY_PART_ORDER[i]!];
  const b = ANATOMY_CAMERA[ANATOMY_PART_ORDER[Math.min(max, i + 1)]!];
  return lerpCamera(a, b, t);
}

function interpolateAnatomyDeck(progress: number): DeckKeyframe {
  const max = ANATOMY_PART_ORDER.length - 1;
  const clamped = Math.max(0, Math.min(max, progress));
  const i = Math.floor(clamped);
  const t = clamped - i;
  const a = ANATOMY_DECK[ANATOMY_PART_ORDER[i]!];
  const b = ANATOMY_DECK[ANATOMY_PART_ORDER[Math.min(max, i + 1)]!];
  return lerpDeck(a, b, t);
}

export function getCameraKeyframe(
  section: SectionId,
  highlightPart: DeckPart | null,
  anatomyProgress = 0,
): CameraKeyframe {
  if (section === 'anatomy') {
    // Scroll-driven: blend smoothly between adjacent part poses.
    return interpolateAnatomyCamera(anatomyProgress);
  }
  if (section === 'configurator' && highlightPart) {
    return CONFIGURATOR_CAMERA[highlightPart];
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
  anatomyProgress = 0,
): DeckKeyframe {
  let base: DeckKeyframe;
  if (section === 'anatomy') {
    // Scroll-driven anatomy: lerp between adjacent part keyframes based
    // on continuous progress so the deck glides through poses as the
    // user scrolls instead of snapping at each midpoint.
    base = interpolateAnatomyDeck(anatomyProgress);
  } else if (section === 'configurator' && highlightPart) {
    base = CONFIGURATOR_DECK[highlightPart];
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
