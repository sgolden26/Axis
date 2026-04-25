import { create } from "zustand";
import type { ScenarioSnapshot, Selection } from "@/types/scenario";

export type LayerKey = "territory" | "cities" | "units_ground" | "units_air" | "units_naval";

export const ALL_LAYERS: LayerKey[] = [
  "territory",
  "cities",
  "units_ground",
  "units_air",
  "units_naval",
];

interface AppState {
  scenario: ScenarioSnapshot | null;
  loadError: string | null;
  selection: Selection;
  visibleLayers: Record<LayerKey, boolean>;

  setScenario: (s: ScenarioSnapshot) => void;
  setLoadError: (e: string | null) => void;
  select: (sel: Selection) => void;
  clearSelection: () => void;
  toggleLayer: (k: LayerKey) => void;
}

export const useAppStore = create<AppState>((set) => ({
  scenario: null,
  loadError: null,
  selection: null,
  visibleLayers: {
    territory: true,
    cities: true,
    units_ground: true,
    units_air: true,
    units_naval: true,
  },
  setScenario: (s) => set({ scenario: s, loadError: null }),
  setLoadError: (e) => set({ loadError: e }),
  select: (sel) => set({ selection: sel }),
  clearSelection: () => set({ selection: null }),
  toggleLayer: (k) =>
    set((state) => ({
      visibleLayers: { ...state.visibleLayers, [k]: !state.visibleLayers[k] },
    })),
}));
