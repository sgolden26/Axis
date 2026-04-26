import { create } from "zustand";
import type {
  ScenarioSnapshot,
  Selection,
  SelectableKind,
} from "@/types/scenario";
import type { ChoroplethMetric } from "@/types/country";
import type { IntelSnapshot, RegionIntel } from "@/types/intel";
import type { PlayerTeam } from "@/state/playerTeam";

export type LayerKey =
  | "oblasts"
  | "cities"
  | "units_ground"
  | "units_air"
  | "units_naval"
  | "depots"
  | "airfields"
  | "naval_bases"
  | "border_crossings"
  | "supply_lines"
  | "frontline";

export const ALL_LAYERS: LayerKey[] = [
  "oblasts",
  "cities",
  "units_ground",
  "units_air",
  "units_naval",
  "depots",
  "airfields",
  "naval_bases",
  "border_crossings",
  "supply_lines",
  "frontline",
];

export type RightTab = "context" | "decision";

export interface HoverPayload {
  kind: SelectableKind;
  id: string;
  x: number;
  y: number;
}

export interface MeasurePoint {
  lon: number;
  lat: number;
}

export interface Bookmark {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
}

interface AppState {
  scenario: ScenarioSnapshot | null;
  loadError: string | null;

  intel: IntelSnapshot | null;
  intelError: string | null;
  lastIntelLoadAt: number | null;
  intelTickIntervalMs: number;

  selection: Selection;
  hover: HoverPayload | null;
  visibleLayers: Record<LayerKey, boolean>;
  selectedActionId: string | null;

  choroplethMetric: ChoroplethMetric;
  rosterOpen: boolean;
  rosterCompareIds: string[];

  rightTab: RightTab;
  rightPanelOpen: boolean;
  /** Full-viewport decision workspace (map behind overlay; PIP + thin ticker). */
  decisionImmersiveOpen: boolean;
  leftDockOpen: boolean;
  oobExpanded: Record<string, boolean>;
  bookmarks: Bookmark[];
  measureActive: boolean;
  measurePath: MeasurePoint[];
  tickerPaused: boolean;
  showHelp: boolean;

  /** Adjudicated side for upcoming move / order affordances. */
  playerTeam: PlayerTeam;

  setScenario: (s: ScenarioSnapshot) => void;
  setLoadError: (e: string | null) => void;
  setIntel: (snapshot: IntelSnapshot) => void;
  setIntelError: (e: string | null) => void;
  select: (sel: Selection) => void;
  clearSelection: () => void;
  setHover: (h: HoverPayload | null) => void;
  toggleLayer: (k: LayerKey) => void;
  setLayer: (k: LayerKey, on: boolean) => void;
  selectAction: (id: string | null) => void;
  setChoroplethMetric: (m: ChoroplethMetric) => void;
  setRosterOpen: (open: boolean) => void;
  toggleRosterCompare: (countryId: string) => void;
  clearRosterCompare: () => void;
  setRightTab: (t: RightTab) => void;
  setRightPanelOpen: (open: boolean) => void;
  setDecisionImmersiveOpen: (open: boolean) => void;
  setLeftDockOpen: (open: boolean) => void;
  toggleOobNode: (id: string) => void;
  setOobExpanded: (id: string, on: boolean) => void;
  addBookmark: (b: Bookmark) => void;
  removeBookmark: (id: string) => void;
  setMeasureActive: (on: boolean) => void;
  pushMeasurePoint: (p: MeasurePoint) => void;
  clearMeasure: () => void;
  setTickerPaused: (p: boolean) => void;
  setShowHelp: (on: boolean) => void;
  setPlayerTeam: (t: PlayerTeam) => void;
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
  hover: null,
  visibleLayers: {
    oblasts: true,
    cities: true,
    units_ground: true,
    units_air: true,
    units_naval: true,
    depots: true,
    airfields: true,
    naval_bases: true,
    border_crossings: false,
    supply_lines: true,
    frontline: true,
  },
  selectedActionId: null,

  choroplethMetric: "war_support",
  rosterOpen: false,
  rosterCompareIds: [],

  rightTab: "context",
  rightPanelOpen: true,
  decisionImmersiveOpen: false,
  leftDockOpen: true,
  oobExpanded: {},
  bookmarks: [],
  measureActive: false,
  measurePath: [],
  tickerPaused: false,
  showHelp: false,
  playerTeam: "blue",

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
  select: (sel) =>
    set((state) => {
      if (state.rightTab === "decision") {
        return { selection: sel, rightPanelOpen: true };
      }
      return {
        selection: sel,
        rightPanelOpen: true,
        rightTab: "context",
        decisionImmersiveOpen: false,
      };
    }),
  clearSelection: () => set({ selection: null }),
  setHover: (h) => set({ hover: h }),
  toggleLayer: (k) =>
    set((state) => ({
      visibleLayers: { ...state.visibleLayers, [k]: !state.visibleLayers[k] },
    })),
  setLayer: (k, on) =>
    set((state) => ({
      visibleLayers: { ...state.visibleLayers, [k]: on },
    })),
  selectAction: (id) => set({ selectedActionId: id }),
  setChoroplethMetric: (m) => set({ choroplethMetric: m }),
  setRosterOpen: (open) => set({ rosterOpen: open }),
  toggleRosterCompare: (countryId) =>
    set((state) => {
      const has = state.rosterCompareIds.includes(countryId);
      if (has) {
        return {
          rosterCompareIds: state.rosterCompareIds.filter((c) => c !== countryId),
        };
      }
      if (state.rosterCompareIds.length >= 4) return state;
      return { rosterCompareIds: [...state.rosterCompareIds, countryId] };
    }),
  clearRosterCompare: () => set({ rosterCompareIds: [] }),
  setRightTab: (t) =>
    set({
      rightTab: t,
      rightPanelOpen: true,
      decisionImmersiveOpen: t === "decision",
    }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setDecisionImmersiveOpen: (open) => set({ decisionImmersiveOpen: open }),
  setLeftDockOpen: (open) => set({ leftDockOpen: open }),
  toggleOobNode: (id) =>
    set((state) => ({
      oobExpanded: { ...state.oobExpanded, [id]: !state.oobExpanded[id] },
    })),
  setOobExpanded: (id, on) =>
    set((state) => ({ oobExpanded: { ...state.oobExpanded, [id]: on } })),
  addBookmark: (b) =>
    set((state) => ({ bookmarks: [...state.bookmarks.filter((x) => x.id !== b.id), b] })),
  removeBookmark: (id) =>
    set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== id) })),
  setMeasureActive: (on) =>
    set((state) => ({
      measureActive: on,
      measurePath: on ? state.measurePath : [],
    })),
  pushMeasurePoint: (p) =>
    set((state) => ({ measurePath: [...state.measurePath, p] })),
  clearMeasure: () => set({ measurePath: [] }),
  setTickerPaused: (p) => set({ tickerPaused: p }),
  setShowHelp: (on) => set({ showHelp: on }),
  setPlayerTeam: (t) => set({ playerTeam: t }),
  intelByRegion: () => {
    const intel = get().intel;
    const out = new Map<string, RegionIntel>();
    if (!intel) return out;
    for (const r of intel.regions) out.set(r.region_id, r);
    return out;
  },
}));
