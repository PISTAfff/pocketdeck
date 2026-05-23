/**
 * useSceneController — stable convenience hook the frontend chrome (Phase 2C)
 * uses to drive the persistent scene.
 *
 * The shape returned here is part of the cross-agent contract:
 *   - setSelection, setDeck, setWheel, setTruck, setGrip
 *   - setActiveSection
 *   - setExploded
 *   - setScrollProgress
 *   - setTransitioning
 *
 * Internally this only forwards to useSceneStore. We expose a hook so Phase 2C
 * can compose additional behavior later (debouncing, tracking, etc.) without
 * each section needing to know about Zustand internals.
 */
'use client';

import { useMemo } from 'react';
import { useSceneStore, type SectionId } from '@/store/scene';
import type {
  ConfigurationSelection,
  DeckGraphic,
  WheelColor,
  TruckColor,
  GripPattern,
} from '@pocketdeck/types';

export interface SceneController {
  setSelection: (sel: ConfigurationSelection) => void;
  setDeck: (v: DeckGraphic) => void;
  setWheel: (v: WheelColor) => void;
  setTruck: (v: TruckColor) => void;
  setGrip: (v: GripPattern) => void;
  setActiveSection: (s: SectionId) => void;
  setExploded: (v: boolean) => void;
  setScrollProgress: (p: number) => void;
  setTransitioning: (v: boolean) => void;
}

export function useSceneController(): SceneController {
  // Pull each setter individually so we don't subscribe to state we don't read.
  const setSelection = useSceneStore((s) => s.setSelection);
  const setDeck = useSceneStore((s) => s.setDeck);
  const setWheel = useSceneStore((s) => s.setWheel);
  const setTruck = useSceneStore((s) => s.setTruck);
  const setGrip = useSceneStore((s) => s.setGrip);
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const setExploded = useSceneStore((s) => s.setExploded);
  const setScrollProgress = useSceneStore((s) => s.setScrollProgress);
  const setTransitioning = useSceneStore((s) => s.setTransitioning);

  return useMemo<SceneController>(
    () => ({
      setSelection,
      setDeck,
      setWheel,
      setTruck,
      setGrip,
      setActiveSection,
      setExploded,
      setScrollProgress,
      setTransitioning,
    }),
    [
      setSelection,
      setDeck,
      setWheel,
      setTruck,
      setGrip,
      setActiveSection,
      setExploded,
      setScrollProgress,
      setTransitioning,
    ],
  );
}
