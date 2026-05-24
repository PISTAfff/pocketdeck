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
  PackageSize,
} from '@pocketdeck/types';

export type SectionId =
  | 'hero'
  | 'manifesto'
  | 'anatomy'
  | 'configurator'
  | 'tricks'
  | 'order';

/**
 * Identifies a major part of the deck for the part-highlight system.
 *
 * 'bearings' is an anatomy-only detail view: it highlights the wheel
 * geometrically (since the bearing is the dark center of the wheel)
 * but the camera/deck pose differs from the 'wheel' overview so the
 * anatomy "Bearings" step doesn't look identical to "Wheels".
 */
export type DeckPart = 'deck' | 'wheel' | 'truck' | 'grip' | 'bearings';

export interface SceneState {
  /** How many boards are in the cart: 1, 2, or 3. Changing this resizes
   *  the `selections` array (filling new slots with the default selection,
   *  trimming if shrinking) and clamps `activeSkateIndex`. */
  packageSize: PackageSize;
  setPackageSize: (size: PackageSize) => void;

  /** One selection per board in the package. Length === packageSize. */
  selections: ConfigurationSelection[];
  /** Which board the wizard / preview is currently editing / showing. */
  activeSkateIndex: number;
  setActiveSkateIndex: (i: number) => void;

  /** Convenience: returns the selection for the currently-active board.
   *  Consumers that need the full array use `selections` directly. */
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

  /**
   * Continuous anatomy section progress (0..PARTS_COUNT-1 = 0..4). Used by
   * Deck.tsx to lerp the camera/deck pose between adjacent part keyframes
   * as the user scrolls, instead of snapping each time the discrete
   * highlight switches at midpoints. Outside the anatomy section the value
   * is clamped (0 above, max below) so the pose holds at the last part.
   */
  anatomyProgress: number;
  setAnatomyProgress: (p: number) => void;

  /**
   * Which phase the configurator wizard is in. The 'package' phase hides
   * the persistent 3D canvas so the package cards (with their own
   * self-contained R3F scenes) can own the right column without the
   * main deck bleeding through. null when the wizard is inactive (other
   * sections).
   */
  wizardPhase: 'package' | 'edit' | 'review' | null;
  setWizardPhase: (p: 'package' | 'edit' | 'review' | null) => void;

  /**
   * True once the preloader has hit 100% and begun fading out. Gates
   * first-paint hero animations so they don't burn through while the
   * preloader is still covering the screen — without this the SplitText
   * reveal completes before the user ever sees the hero.
   */
  preloaderDone: boolean;
  setPreloaderDone: (v: boolean) => void;
}

const DEFAULT_SELECTION: ConfigurationSelection = {
  deck: 'noir',
  wheel: 'bone',
  truck: 'silver',
  grip: 'classic',
};

/** Mutate one entry in a selections array, returning a fresh array. */
function updateAt(
  selections: ConfigurationSelection[],
  i: number,
  patch: Partial<ConfigurationSelection>,
): ConfigurationSelection[] {
  return selections.map((sel, idx) =>
    idx === i ? { ...sel, ...patch } : sel,
  );
}

/** Resize a selections array to the given length, padding with copies of
 *  the last selection (so the new boards have a "starting point" you can
 *  edit, rather than the global default) and trimming if shrinking. */
function resizeSelections(
  selections: ConfigurationSelection[],
  size: PackageSize,
): ConfigurationSelection[] {
  if (selections.length === size) return selections;
  if (selections.length > size) return selections.slice(0, size);
  const seed = selections[selections.length - 1] ?? DEFAULT_SELECTION;
  const next = [...selections];
  while (next.length < size) next.push({ ...seed });
  return next;
}

export const useSceneStore = create<SceneState>((set) => ({
  packageSize: 1,
  setPackageSize: (size) =>
    set((s) => {
      const selections = resizeSelections(s.selections, size);
      const activeSkateIndex = Math.min(s.activeSkateIndex, size - 1);
      return {
        packageSize: size,
        selections,
        activeSkateIndex,
        selection: selections[activeSkateIndex]!,
      };
    }),

  selections: [DEFAULT_SELECTION],
  activeSkateIndex: 0,
  setActiveSkateIndex: (i) =>
    set((s) => {
      const clamped = Math.max(0, Math.min(s.selections.length - 1, i));
      return {
        activeSkateIndex: clamped,
        selection: s.selections[clamped]!,
      };
    }),

  selection: DEFAULT_SELECTION,
  setSelection: (sel) =>
    set((s) => {
      const selections = updateAt(s.selections, s.activeSkateIndex, sel);
      return { selections, selection: selections[s.activeSkateIndex]! };
    }),
  setDeck: (v) =>
    set((s) => {
      const selections = updateAt(s.selections, s.activeSkateIndex, { deck: v });
      return { selections, selection: selections[s.activeSkateIndex]! };
    }),
  setWheel: (v) =>
    set((s) => {
      const selections = updateAt(s.selections, s.activeSkateIndex, { wheel: v });
      return { selections, selection: selections[s.activeSkateIndex]! };
    }),
  setTruck: (v) =>
    set((s) => {
      const selections = updateAt(s.selections, s.activeSkateIndex, { truck: v });
      return { selections, selection: selections[s.activeSkateIndex]! };
    }),
  setGrip: (v) =>
    set((s) => {
      const selections = updateAt(s.selections, s.activeSkateIndex, { grip: v });
      return { selections, selection: selections[s.activeSkateIndex]! };
    }),

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

  anatomyProgress: 0,
  setAnatomyProgress: (p) => set({ anatomyProgress: p }),

  wizardPhase: null,
  setWizardPhase: (p) => set({ wizardPhase: p }),

  preloaderDone: false,
  setPreloaderDone: (v) => set({ preloaderDone: v }),
}));
