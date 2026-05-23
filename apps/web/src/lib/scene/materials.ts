/**
 * Material palette for the procedural fingerboard.
 *
 * The `color` of every entry is held in lock-step with the seed's
 * `swatchHex` (apps/api/src/seed/data.ts). That way the swatch you click
 * in the configurator and the surface you see in 3D are the same hex.
 *
 * Metalness / roughness / emissive are still tuned per material, since
 * those don't change what color a user perceives; they only affect how
 * the material reacts to light.
 */
import type {
  DeckGraphic,
  WheelColor,
  TruckColor,
  GripPattern,
} from '@pocketdeck/types';

export interface MaterialPaint {
  /** Primary color as a CSS hex string. */
  color: string;
  /** Optional second color used by patterned decks/grips for the stripe/accent. */
  accent?: string;
  metalness: number;
  roughness: number;
  /** Optional emissive color for self-lit accents (gold-leaf, ember). */
  emissive?: string;
  emissiveIntensity?: number;
}

// --- Deck graphics. swatchHex from seed/data.ts ----------------------------
export const DECK_MATERIALS: Record<DeckGraphic, MaterialPaint> = {
  noir: {
    color: '#0b0b0d',
    accent: '#1a1a22',
    metalness: 0.2,
    roughness: 0.55,
  },
  sunburst: {
    color: '#f4a93a',
    accent: '#c2410c',
    metalness: 0.15,
    roughness: 0.45,
  },
  circuit: {
    color: '#1a4d4a',
    accent: '#22d3ee',
    metalness: 0.45,
    roughness: 0.35,
    emissive: '#0ea5b7',
    emissiveIntensity: 0.18,
  },
  'gold-leaf': {
    color: '#c9a14a',
    accent: '#f5c451',
    metalness: 0.75,
    roughness: 0.25,
    emissive: '#a37427',
    emissiveIntensity: 0.12,
  },
};

// --- Wheels. swatchHex from seed/data.ts -----------------------------------
export const WHEEL_MATERIALS: Record<WheelColor, MaterialPaint> = {
  bone: {
    color: '#efe6d6',
    metalness: 0.05,
    roughness: 0.55,
  },
  ember: {
    color: '#d94a2b',
    metalness: 0.1,
    roughness: 0.4,
    emissive: '#d94a2b',
    emissiveIntensity: 0.18,
  },
  midnight: {
    color: '#1f2238',
    metalness: 0.1,
    roughness: 0.5,
  },
  lagoon: {
    color: '#1f7a8c',
    metalness: 0.1,
    roughness: 0.45,
  },
  chrome: {
    color: '#bcbec4',
    metalness: 0.95,
    roughness: 0.15,
  },
};

// --- Trucks. swatchHex from seed/data.ts -----------------------------------
export const TRUCK_MATERIALS: Record<TruckColor, MaterialPaint> = {
  silver: {
    color: '#bcc0c5',
    metalness: 0.95,
    roughness: 0.25,
  },
  gunmetal: {
    color: '#3a3d44',
    metalness: 0.85,
    roughness: 0.35,
  },
  'rose-gold': {
    color: '#b76e79',
    metalness: 0.9,
    roughness: 0.22,
  },
};

// --- Grip. The swatches are SVG thumbnails; the 3D base + accent are
// tuned so each pattern is clearly distinct on the deck top.
export const GRIP_MATERIALS: Record<GripPattern, MaterialPaint> = {
  classic: {
    // Pure grit, dark base + slightly lighter dotted accent.
    color: '#0a0a0e',
    accent: '#2a2a30',
    metalness: 0.05,
    roughness: 0.95,
  },
  tiger: {
    // Black base with a strong orange tiger stripe.
    color: '#0e0a06',
    accent: '#f59e0b',
    metalness: 0.05,
    roughness: 0.9,
  },
  topo: {
    // Subtle teal-green base with a bright topo line accent.
    color: '#05120e',
    accent: '#34d399',
    metalness: 0.08,
    roughness: 0.85,
  },
};
