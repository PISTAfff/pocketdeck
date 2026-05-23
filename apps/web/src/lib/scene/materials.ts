/**
 * Material palette for the procedural fingerboard.
 *
 * Mirrors the swatchHex / priceModifier values that the backend (Phase 2A)
 * seeds for each variant. The frontend Configurator should read the canonical
 * values from the API for display; this file is only the visual palette used
 * by the 3D scene so we can re-color materials instantly.
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

export const DECK_MATERIALS: Record<DeckGraphic, MaterialPaint> = {
  noir: {
    color: '#0d0d12',
    accent: '#1a1a22',
    metalness: 0.2,
    roughness: 0.55,
  },
  sunburst: {
    color: '#c2410c',
    accent: '#fbbf24',
    metalness: 0.15,
    roughness: 0.45,
  },
  circuit: {
    color: '#0f172a',
    accent: '#22d3ee',
    metalness: 0.45,
    roughness: 0.35,
    emissive: '#0ea5b7',
    emissiveIntensity: 0.18,
  },
  'gold-leaf': {
    color: '#1a1410',
    accent: '#f5c451',
    metalness: 0.75,
    roughness: 0.25,
    emissive: '#a37427',
    emissiveIntensity: 0.12,
  },
};

export const WHEEL_MATERIALS: Record<WheelColor, MaterialPaint> = {
  bone: {
    color: '#ece6d9',
    metalness: 0.05,
    roughness: 0.55,
  },
  ember: {
    color: '#ff5b14',
    metalness: 0.1,
    roughness: 0.4,
    emissive: '#ff5b14',
    emissiveIntensity: 0.18,
  },
  midnight: {
    color: '#1d2233',
    metalness: 0.1,
    roughness: 0.5,
  },
  lagoon: {
    color: '#0fb9b1',
    metalness: 0.1,
    roughness: 0.45,
  },
  chrome: {
    color: '#d8dde6',
    metalness: 0.95,
    roughness: 0.15,
  },
};

export const TRUCK_MATERIALS: Record<TruckColor, MaterialPaint> = {
  silver: {
    color: '#c9ccd1',
    metalness: 0.95,
    roughness: 0.25,
  },
  gunmetal: {
    color: '#3a3f47',
    metalness: 0.85,
    roughness: 0.35,
  },
  'rose-gold': {
    color: '#d4928a',
    metalness: 0.9,
    roughness: 0.22,
  },
};

export const GRIP_MATERIALS: Record<GripPattern, MaterialPaint> = {
  classic: {
    color: '#0a0a0e',
    accent: '#1a1a22',
    metalness: 0.05,
    roughness: 0.95,
  },
  tiger: {
    color: '#0a0a0e',
    accent: '#f59e0b',
    metalness: 0.05,
    roughness: 0.9,
  },
  topo: {
    color: '#0a0a0e',
    accent: '#34d399',
    metalness: 0.08,
    roughness: 0.85,
  },
};
