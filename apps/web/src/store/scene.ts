/**
 * Scene store, global state for the persistent R3F scene.
 *
 * Phase 2B owns this file. The shape is part of the cross-agent contract:
 * Phase 2C drives this store from page sections and the configurator UI.
 *
 * Stable surface (consumers may rely on this):
 *   - selection                  : the current product selection (deck/wheel/truck/grip)
 *   - setSelection / setDeck /
 *     setWheel / setTruck /
 *     setGrip                    : selection mutators
 *   - activeSection              : which section the viewport is currently anchored to
 *   - setActiveSection
 *   - exploded                   : whether the anatomy section is currently in exploded view
 *   - setExploded
 *   - scrollProgress             : 0..1 page scroll progress (driven by Lenis from Phase 2C)
 *   - setScrollProgress
 *   - transitioning              : true during page transitions (lets Effects enable chromatic aberration)
 *   - setTransitioning
 */
import { create } from 'zustand';
import type {
  ConfigurationSelection,
  DeckGraphic,
  WheelColor,
  TruckColor,
  GripPattern,
} from '@pocketdeck/types';

export type SectionId =
  | 'hero'
  | 'manifesto'
  | 'anatomy'
  | 'configurator'
  | 'tricks'
  | 'order';

/** Identifies a major part of the deck for the configurator's part highlight. */
export type DeckPart = 'deck' | 'wheel' | 'truck' | 'grip';

export interface SceneState {
  /** The current product configuration. Mirrors the selection sent to the API. */
  selection: ConfigurationSelection;
  setSelection: (sel: ConfigurationSelection) => void;
  setDeck: (v: DeckGraphic) => void;
  setWheel: (v: WheelColor) => void;
  setTruck: (v: TruckColor) => void;
  setGrip: (v: GripPattern) => void;

  /** Which section the page is currently centered on. Drives camera + deck pose. */
  activeSection: SectionId;
  setActiveSection: (s: SectionId) => void;

  /** Whether anatomy is in exploded view (parts fly apart). */
  exploded: boolean;
  setExploded: (v: boolean) => void;

  /** Global page scroll progress 0..1, driven by Lenis from the chrome layer. */
  scrollProgress: number;
  setScrollProgress: (p: number) => void;

  /** True briefly during page transitions, lets the scene react (e.g. chromatic aberration). */
  transitioning: boolean;
  setTransitioning: (v: boolean) => void;

  /** Persistent canvas wrapper opacity 0..1, set by the scroll handler. */
  sceneOpacity: number;
  setSceneOpacity: (v: number) => void;

  /**
   * Which deck part the configurator wizard currently focuses on. When set,
   * the Deck component dims the other parts so the active component pops.
   * null when no part is being edited (e.g. hero, review step).
   */
  highlightPart: DeckPart | null;
  setHighlightPart: (p: DeckPart | null) => void;
}

const DEFAULT_SELECTION: ConfigurationSelection = {
  deck: 'noir',
  wheel: 'bone',
  truck: 'silver',
  grip: 'classic',
};

export const useSceneStore = create<SceneState>((set) => ({
  selection: DEFAULT_SELECTION,
  setSelection: (sel) => set({ selection: sel }),
  setDeck: (v) => set((s) => ({ selection: { ...s.selection, deck: v } })),
  setWheel: (v) => set((s) => ({ selection: { ...s.selection, wheel: v } })),
  setTruck: (v) => set((s) => ({ selection: { ...s.selection, truck: v } })),
  setGrip: (v) => set((s) => ({ selection: { ...s.selection, grip: v } })),

  activeSection: 'hero',
  setActiveSection: (s) => set({ activeSection: s }),

  exploded: false,
  setExploded: (v) => set({ exploded: v }),

  scrollProgress: 0,
  setScrollProgress: (p) => set({ scrollProgress: p }),

  transitioning: false,
  setTransitioning: (v) => set({ transitioning: v }),

  sceneOpacity: 1,
  setSceneOpacity: (v) => set({ sceneOpacity: v }),

  highlightPart: null,
  setHighlightPart: (p) => set({ highlightPart: p }),
}));
