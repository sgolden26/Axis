import { create } from "zustand";
import type {
  ScenarioSnapshot,
  Selection,
  SelectableKind,
} from "@/types/scenario";
import type { ChoroplethMetric } from "@/types/country";
import type { IntelSnapshot, RegionIntel } from "@/types/intel";
import type { PlayerTeam } from "@/state/playerTeam";
import type { GroundMoveDraft, GroundMoveMode } from "@/state/groundMove";
import { isGroundCombatUnit, moveRadiusToastMessage } from "@/state/groundMove";
import {
  batchFromStaged,
  emptyTeamMap,
  newOrderId,
  type StagedMoveOrder,
  type StagedOrder,
} from "@/state/orders";
import { executeOrders } from "@/api/executeOrders";
import { greatCircleInterpolate } from "@/map/geodesic";

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

  /** Per-unit ground move planning (map overlay + pending destination until “play”). */
  groundMoveDrafts: Record<string, GroundMoveDraft>;
  /** Ephemeral notice when a click is clamped to the movement ring. */
  moveRadiusToast: string | null;

  /** Per-team shopping cart of staged orders pending Execute. */
  stagedOrders: Record<PlayerTeam, StagedOrder[]>;
  cartOpen: boolean;
  /** True while an OrderBatch is in-flight or being animated. */
  executing: boolean;
  /** Per-unit live position overrides used by the animator while orders apply. */
  unitPositionOverrides: Record<string, [number, number]>;
  /** Tick that bumps each time overrides change so map effects can re-run cheaply. */
  unitPositionOverridesEpoch: number;
  /** Last execute() error (transport-level), surfaced by the cart UI. */
  orderExecutionError: string | null;

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

  startGroundMove: (unitId: string, mode: GroundMoveMode) => void;
  setGroundMoveDestination: (unitId: string, dest: [number, number]) => void;
  confirmGroundMovePicking: (unitId: string) => void;
  cancelGroundMove: (unitId: string) => void;
  showMoveRadiusToast: (mode: GroundMoveMode) => void;
  dismissMoveRadiusToast: () => void;

  stageMoveFromDraft: (unitId: string) => string | null;
  removeStagedOrder: (id: string) => void;
  clearStagedOrders: (team?: PlayerTeam) => void;
  setCartOpen: (open: boolean) => void;
  executeStagedOrders: () => Promise<void>;
  dismissOrderExecutionError: () => void;
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

  groundMoveDrafts: {},
  moveRadiusToast: null,

  stagedOrders: emptyTeamMap<StagedOrder[]>(() => []),
  cartOpen: false,
  executing: false,
  unitPositionOverrides: {},
  unitPositionOverridesEpoch: 0,
  orderExecutionError: null,

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
  setPlayerTeam: (t) =>
    set((s) => (s.playerTeam === t ? s : { playerTeam: t, groundMoveDrafts: {} })),
  startGroundMove: (unitId, mode) => {
    const state0 = get();
    const sc = state0.scenario;
    const unit = sc?.units.find((u) => u.id === unitId);
    if (!unit || !isGroundCombatUnit(unit.domain)) return;
    const faction = sc?.factions.find((f) => f.id === unit.faction_id);
    if (!faction || faction.allegiance !== state0.playerTeam) return;
    set((state) => {
      const prev = state.groundMoveDrafts[unitId];
      const keepDest = prev?.mode === mode ? prev.destination : null;
      return {
        groundMoveDrafts: {
          ...state.groundMoveDrafts,
          [unitId]: {
            mode,
            origin: [unit.position[0], unit.position[1]],
            destination: keepDest,
            pickingDestination: true,
          },
        },
      };
    });
  },
  setGroundMoveDestination: (unitId, dest) =>
    set((state) => {
      const d = state.groundMoveDrafts[unitId];
      if (!d || !d.pickingDestination) return state;
      return {
        groundMoveDrafts: {
          ...state.groundMoveDrafts,
          [unitId]: { ...d, destination: dest },
        },
      };
    }),
  confirmGroundMovePicking: (unitId) =>
    set((state) => {
      const d = state.groundMoveDrafts[unitId];
      if (!d) return state;
      return {
        groundMoveDrafts: {
          ...state.groundMoveDrafts,
          [unitId]: { ...d, pickingDestination: false },
        },
      };
    }),
  cancelGroundMove: (unitId) =>
    set((state) => {
      const next = { ...state.groundMoveDrafts };
      delete next[unitId];
      return { groundMoveDrafts: next };
    }),
  showMoveRadiusToast: (mode) => set({ moveRadiusToast: moveRadiusToastMessage(mode) }),
  dismissMoveRadiusToast: () => set({ moveRadiusToast: null }),

  stageMoveFromDraft: (unitId) => {
    const state = get();
    const draft = state.groundMoveDrafts[unitId];
    if (!draft || !draft.destination) return null;
    const sc = state.scenario;
    const unit = sc?.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const faction = sc?.factions.find((f) => f.id === unit.faction_id);
    if (!faction || faction.allegiance !== state.playerTeam) return null;

    const id = newOrderId("ord.move");
    const order: StagedMoveOrder = {
      id,
      kind: "move",
      team: state.playerTeam,
      unitId,
      mode: draft.mode,
      origin: [draft.origin[0], draft.origin[1]],
      destination: [draft.destination[0], draft.destination[1]],
    };
    set((s) => {
      const teamOrders = s.stagedOrders[s.playerTeam];
      // Replace any prior staged move for the same unit; one in-flight order per unit.
      const filtered = teamOrders.filter(
        (o) => !(o.kind === "move" && o.unitId === unitId),
      );
      const nextDrafts = { ...s.groundMoveDrafts };
      delete nextDrafts[unitId];
      return {
        stagedOrders: {
          ...s.stagedOrders,
          [s.playerTeam]: [...filtered, order],
        },
        groundMoveDrafts: nextDrafts,
        cartOpen: true,
      };
    });
    return id;
  },
  removeStagedOrder: (id) =>
    set((s) => {
      const next: Record<PlayerTeam, StagedOrder[]> = {
        red: s.stagedOrders.red.filter((o) => o.id !== id),
        blue: s.stagedOrders.blue.filter((o) => o.id !== id),
      };
      return { stagedOrders: next };
    }),
  clearStagedOrders: (team) =>
    set((s) => {
      if (team) {
        return { stagedOrders: { ...s.stagedOrders, [team]: [] } };
      }
      return { stagedOrders: emptyTeamMap<StagedOrder[]>(() => []) };
    }),
  setCartOpen: (open) => set({ cartOpen: open }),
  executeStagedOrders: async () => {
    const state = get();
    if (state.executing) return;
    const team = state.playerTeam;
    const orders = state.stagedOrders[team];
    if (orders.length === 0) return;

    set({ executing: true, orderExecutionError: null });
    try {
      const result = await executeOrders(batchFromStaged(team, orders));
      if (!result.ok) {
        const failed = result.outcomes.filter((o) => !o.ok);
        const summary =
          failed.length === 0
            ? "Some orders were rejected."
            : failed.map((o) => `· ${o.message}`).join("\n");
        set({ executing: false, orderExecutionError: summary });
        return;
      }
      await animateMoveOrders(orders, set, get);
      set((s) => ({
        scenario: result.snapshot,
        stagedOrders: { ...s.stagedOrders, [team]: [] },
        unitPositionOverrides: {},
        unitPositionOverridesEpoch: s.unitPositionOverridesEpoch + 1,
        executing: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ executing: false, orderExecutionError: message });
    }
  },
  dismissOrderExecutionError: () => set({ orderExecutionError: null }),

  intelByRegion: () => {
    const intel = get().intel;
    const out = new Map<string, RegionIntel>();
    if (!intel) return out;
    for (const r of intel.regions) out.set(r.region_id, r);
    return out;
  },
}));

const MOVE_ANIMATION_MS = 2500;

/** Tween each move order's unit along the geodesic origin -> destination.
 *
 *  Writes a transient `unitPositionOverrides` map that the units layer reads
 *  before falling back to scenario position. Resolves once the tween ends,
 *  letting the executor commit the authoritative server snapshot.
 */
function animateMoveOrders(
  orders: StagedOrder[],
  set: (
    partial:
      | Partial<AppState>
      | ((s: AppState) => Partial<AppState>),
  ) => void,
  _get: () => AppState,
): Promise<void> {
  const moves = orders.filter((o): o is StagedMoveOrder => o.kind === "move");
  if (moves.length === 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / MOVE_ANIMATION_MS);
      const eased = easeInOutCubic(t);
      const overrides: Record<string, [number, number]> = {};
      for (const m of moves) {
        overrides[m.unitId] = greatCircleInterpolate(m.origin, m.destination, eased);
      }
      set((s) => ({
        unitPositionOverrides: overrides,
        unitPositionOverridesEpoch: s.unitPositionOverridesEpoch + 1,
      }));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
