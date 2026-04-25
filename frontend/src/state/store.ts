import { create } from "zustand";
import type { ScenarioSnapshot, Selection } from "@/types/scenario";
import type { IntelSnapshot, RegionIntel } from "@/types/intel";

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

  intel: IntelSnapshot | null;
  intelError: string | null;
  lastIntelLoadAt: number | null;
  intelTickIntervalMs: number;

  selection: Selection;
  visibleLayers: Record<LayerKey, boolean>;
  selectedActionId: string | null;

  setScenario: (s: ScenarioSnapshot) => void;
  setLoadError: (e: string | null) => void;
  setIntel: (snapshot: IntelSnapshot) => void;
  setIntelError: (e: string | null) => void;
  select: (sel: Selection) => void;
  clearSelection: () => void;
  toggleLayer: (k: LayerKey) => void;
  selectAction: (id: string | null) => void;
  intelByRegion: () => Map<string, RegionIntel>;
}

export const useAppStore = create<AppState>((set, get) => ({
  scenario: null,
  loadError: null,

  intel: null,
  intelError: null,
  lastIntelLoadAt: null,
  intelTickIntervalMs: 5000,

  selection: null,
  visibleLayers: {
    territory: true,
    cities: true,
    units_ground: true,
    units_air: true,
    units_naval: true,
  },
  selectedActionId: null,

  setScenario: (s) =>
    set((state) => ({
      scenario: s,
      loadError: null,
      selectedActionId: state.selectedActionId ?? s.actions[0]?.id ?? null,
    })),
  setLoadError: (e) => set({ loadError: e }),
  setIntel: (snapshot) =>
    set({ intel: snapshot, intelError: null, lastIntelLoadAt: Date.now() }),
  setIntelError: (e) => set({ intelError: e }),
  select: (sel) => set({ selection: sel }),
  clearSelection: () => set({ selection: null }),
  toggleLayer: (k) =>
    set((state) => ({
      visibleLayers: { ...state.visibleLayers, [k]: !state.visibleLayers[k] },
    })),
  selectAction: (id) => set({ selectedActionId: id }),
  intelByRegion: () => {
    const intel = get().intel;
    const out = new Map<string, RegionIntel>();
    if (!intel) return out;
    for (const r of intel.regions) out.set(r.region_id, r);
    return out;
  },
}));
