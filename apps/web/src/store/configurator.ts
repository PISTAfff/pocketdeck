/**
 * Configurator store — UI-only state.
 *
 * The current selection lives in `useSceneStore` (owned by Agent B). This store
 * holds the fetched product document and any form-submission state for the
 * configurator section so several components can share it without re-fetching.
 */
import { create } from 'zustand';
import type { Product } from '@pocketdeck/types';

interface ConfiguratorState {
  product: Product | null;
  loading: boolean;
  error: string | null;
  setProduct: (p: Product | null) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
}

export const useConfiguratorStore = create<ConfiguratorState>((set) => ({
  product: null,
  loading: false,
  error: null,
  setProduct: (product) => set({ product, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
