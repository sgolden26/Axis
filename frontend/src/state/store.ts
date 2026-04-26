import { create } from "zustand";
import type {
  ScenarioSnapshot,
  Selection,
  SelectableKind,
} from "@/types/scenario";
import type { ChoroplethMetric } from "@/types/country";
import type { IntelEvent, IntelSnapshot, RegionIntel } from "@/types/intel";
import type { PlayerTeam } from "@/state/playerTeam";
import type { GroundMoveDraft, GroundMoveMode } from "@/state/groundMove";
import { isGroundCombatUnit, moveRadiusToastMessage } from "@/state/groundMove";
import {
  batchFromStaged,
  emptyTeamMap,
  newOrderId,
  ownerKey,
  type StagedAirSortieOrder,
  type StagedEngageOrder,
  type StagedEntrenchOrder,
  type StagedInterdictSupplyOrder,
  type StagedMissileStrikeOrder,
  type StagedMoveOrder,
  type StagedNavalMoveOrder,
  type StagedNavalStrikeOrder,
  type StagedOrder,
  type StagedRebaseAirOrder,
  type StagedResupplyOrder,
} from "@/state/orders";
import type {
  SortieMissionDTO,
  StrikeTargetKindDTO,
} from "@/types/orders";
import {
  buildActionDraft,
  type ActionDraft,
  type ActionDraftCandidate,
  type DraftSpec,
} from "@/state/actionDraft";
import { executeOrders } from "@/api/executeOrders";
import { executeRound } from "@/api/executeRound";
import { greatCircleInterpolate, haversineKm } from "@/map/geodesic";

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
  | "missile_ranges"
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
  "missile_ranges",
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

  /** Article currently shown in the right-side ArticleDrawer (clicked from
   * the ticker, RegionSummary, or FactorFlowGraph signal nodes). */
  selectedArticle: IntelEvent | null;

  /** Adjudicated side for upcoming move / order affordances. */
  playerTeam: PlayerTeam;

  /** Per-unit ground move planning (map overlay + pending destination until “play”). */
  groundMoveDrafts: Record<string, GroundMoveDraft>;
  /** Ephemeral notice when a click is clamped to the movement ring. */
  moveRadiusToast: string | null;

  /** Single in-flight non-move order draft (engage / strike / rebase / etc).
   *  Map clicks snap to its candidate list while `pickingTarget` is true. */
  actionDraft: ActionDraft | null;
  /** Last "no candidates" / "snapped" toast surfaced by draft handlers. */
  actionDraftToast: string | null;

  /** Per-team shopping cart of staged orders pending Execute. */
  stagedOrders: Record<PlayerTeam, StagedOrder[]>;
  /** Per-team "Ready" lock. Both teams ready -> Execute fires the round. */
  roundReady: Record<PlayerTeam, boolean>;
  cartOpen: boolean;
  /** True while an OrderBatch is in-flight or being animated. */
  executing: boolean;
  /** Per-unit live position overrides used by the animator while orders apply. */
  unitPositionOverrides: Record<string, [number, number]>;
  /** Tick that bumps each time overrides change so map effects can re-run cheaply. */
  unitPositionOverridesEpoch: number;
  /** Last execute() error (transport-level), surfaced by the cart UI. */
  orderExecutionError: string | null;
  /** Last successful execution: outcome details + political summary (for the toast/cart). */
  lastExecutionResult: {
    at: number;
    outcomes: import("@/types/orders").OrderOutcomeDTO[];
    political_summary: Record<string, Record<string, number>>;
  } | null;

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
  openArticle: (ev: IntelEvent) => void;
  closeArticle: () => void;
  setPlayerTeam: (t: PlayerTeam) => void;
  intelByRegion: () => Map<string, RegionIntel>;

  startGroundMove: (unitId: string, mode: GroundMoveMode) => void;
  setGroundMoveDestination: (unitId: string, dest: [number, number]) => void;
  confirmGroundMovePicking: (unitId: string) => void;
  cancelGroundMove: (unitId: string) => void;
  showMoveRadiusToast: (mode: GroundMoveMode) => void;
  dismissMoveRadiusToast: () => void;

  /** Open a non-move draft (range ring + candidate snap on the map). Returns a
   *  warning string when the draft was opened but no candidates exist; null on
   *  clean start; `"invalid"` when the spec doesn't match the scenario. */
  startActionDraft: (spec: DraftSpec) => string | null;
  /** Select a specific candidate (typically by clicking on the map).
   *  Pass null to deselect without cancelling the draft. */
  setActionDraftCandidate: (candidateId: string | null) => void;
  cancelActionDraft: () => void;
  /** Commit the draft to the staged-orders cart (calls the corresponding
   *  stage* helper). Returns the staged order id, or null if uncommittable. */
  commitActionDraft: () => string | null;
  dismissActionDraftToast: () => void;

  stageMoveFromDraft: (unitId: string) => string | null;
  stageEntrenchOrder: (unitId: string) => string | null;
  stageEngageOrder: (attackerId: string, targetId: string) => string | null;
  stageRebaseAir: (unitId: string, airfieldId: string) => string | null;
  stageAirSortie: (
    unitId: string,
    mission: SortieMissionDTO,
    target: { kind: StrikeTargetKindDTO; id: string },
  ) => string | null;
  stageNavalMove: (unitId: string, dest: [number, number]) => string | null;
  stageNavalStrike: (
    unitId: string,
    target: { kind: StrikeTargetKindDTO; id: string },
  ) => string | null;
  stageMissileStrike: (
    platformId: string,
    target: { kind: StrikeTargetKindDTO; id: string },
  ) => string | null;
  stageResupply: (depotId: string, unitId: string) => string | null;
  stageInterdictSupply: (
    platformKind: "air_wing" | "missile_range",
    platformId: string,
    supplyLineId: string,
  ) => string | null;
  removeStagedOrder: (id: string) => void;
  clearStagedOrders: (team?: PlayerTeam) => void;
  setCartOpen: (open: boolean) => void;
  /** Toggle a team's Ready lock. Locked teams cannot stage/remove orders. */
  setRoundReady: (team: PlayerTeam, ready: boolean) => void;
  executeStagedOrders: () => Promise<void>;
  /** Hot-seat round execute: requires both teams to be Ready. */
  executeRound: () => Promise<void>;
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
    missile_ranges: false,
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
  selectedArticle: null,
  playerTeam: "blue",

  groundMoveDrafts: {},
  moveRadiusToast: null,
  actionDraft: null,
  actionDraftToast: null,

  stagedOrders: emptyTeamMap<StagedOrder[]>(() => []),
  roundReady: { red: false, blue: false },
  cartOpen: false,
  executing: false,
  unitPositionOverrides: {},
  unitPositionOverridesEpoch: 0,
  orderExecutionError: null,
  lastExecutionResult: null,

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
  openArticle: (ev) => set({ selectedArticle: ev }),
  closeArticle: () => set({ selectedArticle: null }),
  setPlayerTeam: (t) =>
    set((s) =>
      s.playerTeam === t
        ? s
        : { playerTeam: t, groundMoveDrafts: {}, actionDraft: null, actionDraftToast: null },
    ),
  startGroundMove: (unitId, mode) => {
    const state0 = get();
    if (state0.roundReady[state0.playerTeam]) return;
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

  startActionDraft: (spec) => {
    const state0 = get();
    if (state0.roundReady[state0.playerTeam]) {
      set({ actionDraftToast: "Team is ready. Unready to plan more orders." });
      return "invalid";
    }
    const sc = state0.scenario;
    if (!sc) return "invalid";
    const built = buildActionDraft(sc, state0.playerTeam, spec);
    if (!built) {
      set({ actionDraftToast: "Cannot start action: invalid origin." });
      return "invalid";
    }
    set({
      actionDraft: built.draft,
      actionDraftToast: built.warning,
      groundMoveDrafts: {},
    });
    return built.warning;
  },
  setActionDraftCandidate: (candidateId) =>
    set((s) => {
      const d = s.actionDraft;
      if (!d) return s;
      if (candidateId == null) {
        return { actionDraft: { ...d, selectedCandidateId: null } };
      }
      const ok = d.candidates.some((c) => c.id === candidateId);
      if (!ok) return s;
      return { actionDraft: { ...d, selectedCandidateId: candidateId } };
    }),
  cancelActionDraft: () => set({ actionDraft: null, actionDraftToast: null }),
  dismissActionDraftToast: () => set({ actionDraftToast: null }),
  commitActionDraft: () => {
    const state = get();
    const d = state.actionDraft;
    if (!d) return null;
    const cid = d.selectedCandidateId;
    if (!cid) return null;
    const cand = d.candidates.find((c) => c.id === cid);
    if (!cand) return null;
    const staged = stagedFromActionDraft(d, cand, state);
    if (!staged) return null;
    set({ actionDraft: null, actionDraftToast: null });
    return staged;
  },

  stageMoveFromDraft: (unitId) => {
    const state = get();
    if (state.roundReady[state.playerTeam]) return null;
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
      const filtered = dedupeByOwner(teamOrders, order);
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
  stageEntrenchOrder: (unitId) => {
    const state = get();
    const sc = state.scenario;
    const unit = sc?.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const faction = sc?.factions.find((f) => f.id === unit.faction_id);
    if (!faction || faction.allegiance !== state.playerTeam) return null;
    if (unit.domain !== "ground") return null;
    const id = newOrderId("ord.entrench");
    const order: StagedEntrenchOrder = {
      id, kind: "entrench", team: state.playerTeam,
      unitId, unitName: unit.name,
    };
    return commitStaged(set, state.playerTeam, order);
  },
  stageEngageOrder: (attackerId, targetId) => {
    const state = get();
    const sc = state.scenario;
    if (!sc) return null;
    const attacker = sc.units.find((u) => u.id === attackerId);
    const target = sc.units.find((u) => u.id === targetId);
    if (!attacker || !target) return null;
    const faction = sc.factions.find((f) => f.id === attacker.faction_id);
    if (!faction || faction.allegiance !== state.playerTeam) return null;
    if (attacker.faction_id === target.faction_id) return null;
    const id = newOrderId("ord.engage");
    const order: StagedEngageOrder = {
      id, kind: "engage", team: state.playerTeam,
      attackerId, attackerName: attacker.name,
      targetId, targetName: target.name,
      rangeKm: haversineKm(attacker.position, target.position),
    };
    return commitStaged(set, state.playerTeam, order);
  },
  stageRebaseAir: (unitId, airfieldId) => {
    const state = get();
    const sc = state.scenario;
    if (!sc) return null;
    const unit = sc.units.find((u) => u.id === unitId);
    const airfield = sc.airfields.find((a) => a.id === airfieldId);
    if (!unit || !airfield) return null;
    const faction = sc.factions.find((f) => f.id === unit.faction_id);
    if (!faction || faction.allegiance !== state.playerTeam) return null;
    if (unit.domain !== "air") return null;
    const id = newOrderId("ord.rebase");
    const order: StagedRebaseAirOrder = {
      id, kind: "rebase_air", team: state.playerTeam,
      unitId, unitName: unit.name,
      airfieldId, airfieldName: airfield.name,
      origin: [unit.position[0], unit.position[1]],
      destination: [airfield.position[0], airfield.position[1]],
    };
    return commitStaged(set, state.playerTeam, order);
  },
  stageAirSortie: (unitId, mission, target) => {
    const state = get();
    const sc = state.scenario;
    if (!sc) return null;
    const unit = sc.units.find((u) => u.id === unitId);
    if (!unit || unit.domain !== "air") return null;
    const faction = sc.factions.find((f) => f.id === unit.faction_id);
    if (!faction || faction.allegiance !== state.playerTeam) return null;
    const lookup = lookupTarget(sc, target.kind, target.id);
    if (!lookup) return null;
    const id = newOrderId(`ord.sortie.${mission}`);
    const order: StagedAirSortieOrder = {
      id, kind: "air_sortie", team: state.playerTeam,
      unitId, unitName: unit.name, mission,
      targetKind: target.kind, targetId: target.id, targetName: lookup.name,
      origin: [unit.position[0], unit.position[1]],
      targetPos: lookup.pos,
    };
    return commitStaged(set, state.playerTeam, order);
  },
  stageNavalMove: (unitId, dest) => {
    const state = get();
    const sc = state.scenario;
    if (!sc) return null;
    const unit = sc.units.find((u) => u.id === unitId);
    if (!unit || unit.domain !== "naval") return null;
    const faction = sc.factions.find((f) => f.id === unit.faction_id);
    if (!faction || faction.allegiance !== state.playerTeam) return null;
    const id = newOrderId("ord.naval_move");
    const order: StagedNavalMoveOrder = {
      id, kind: "naval_move", team: state.playerTeam,
      unitId, unitName: unit.name,
      origin: [unit.position[0], unit.position[1]],
      destination: dest,
    };
    return commitStaged(set, state.playerTeam, order);
  },
  stageNavalStrike: (unitId, target) => {
    const state = get();
    const sc = state.scenario;
    if (!sc) return null;
    const unit = sc.units.find((u) => u.id === unitId);
    if (!unit || unit.domain !== "naval") return null;
    const faction = sc.factions.find((f) => f.id === unit.faction_id);
    if (!faction || faction.allegiance !== state.playerTeam) return null;
    const lookup = lookupTarget(sc, target.kind, target.id);
    if (!lookup) return null;
    const id = newOrderId("ord.naval_strike");
    const order: StagedNavalStrikeOrder = {
      id, kind: "naval_strike", team: state.playerTeam,
      unitId, unitName: unit.name,
      targetKind: target.kind, targetId: target.id, targetName: lookup.name,
      origin: [unit.position[0], unit.position[1]],
      targetPos: lookup.pos,
    };
    return commitStaged(set, state.playerTeam, order);
  },
  stageMissileStrike: (platformId, target) => {
    const state = get();
    const sc = state.scenario;
    if (!sc) return null;
    const platform = sc.missile_ranges.find((m) => m.id === platformId);
    if (!platform) return null;
    const faction = sc.factions.find((f) => f.id === platform.faction_id);
    if (!faction || faction.allegiance !== state.playerTeam) return null;
    const lookup = lookupTarget(sc, target.kind, target.id);
    if (!lookup) return null;
    const id = newOrderId("ord.missile");
    const order: StagedMissileStrikeOrder = {
      id, kind: "missile_strike", team: state.playerTeam,
      platformId, platformName: platform.name,
      targetKind: target.kind, targetId: target.id, targetName: lookup.name,
      origin: [platform.origin[0], platform.origin[1]],
      targetPos: lookup.pos,
    };
    return commitStaged(set, state.playerTeam, order);
  },
  stageResupply: (depotId, unitId) => {
    const state = get();
    const sc = state.scenario;
    if (!sc) return null;
    const depot = sc.depots.find((d) => d.id === depotId);
    const unit = sc.units.find((u) => u.id === unitId);
    if (!depot || !unit) return null;
    const faction = sc.factions.find((f) => f.id === depot.faction_id);
    if (!faction || faction.allegiance !== state.playerTeam) return null;
    const id = newOrderId("ord.resupply");
    const order: StagedResupplyOrder = {
      id, kind: "resupply", team: state.playerTeam,
      depotId, depotName: depot.name,
      unitId, unitName: unit.name,
    };
    return commitStaged(set, state.playerTeam, order);
  },
  stageInterdictSupply: (platformKind, platformId, supplyLineId) => {
    const state = get();
    const sc = state.scenario;
    if (!sc) return null;
    const supplyLine = sc.supply_lines.find((s) => s.id === supplyLineId);
    if (!supplyLine) return null;
    let origin: [number, number];
    let platformName: string;
    let factionId: string;
    if (platformKind === "air_wing") {
      const u = sc.units.find((x) => x.id === platformId);
      if (!u || u.domain !== "air") return null;
      origin = [u.position[0], u.position[1]];
      platformName = u.name;
      factionId = u.faction_id;
    } else {
      const m = sc.missile_ranges.find((x) => x.id === platformId);
      if (!m || m.category === "sam") return null;
      origin = [m.origin[0], m.origin[1]];
      platformName = m.name;
      factionId = m.faction_id;
    }
    const faction = sc.factions.find((f) => f.id === factionId);
    if (!faction || faction.allegiance !== state.playerTeam) return null;
    const mid = supplyLineMidpoint(supplyLine.path);
    const id = newOrderId("ord.interdict");
    const order: StagedInterdictSupplyOrder = {
      id, kind: "interdict_supply", team: state.playerTeam,
      platformKind, platformId, platformName,
      supplyLineId, supplyLineName: supplyLine.name,
      origin, targetPos: mid,
    };
    return commitStaged(set, state.playerTeam, order);
  },
  removeStagedOrder: (id) =>
    set((s) => {
      const next: Record<PlayerTeam, StagedOrder[]> = {
        red: s.roundReady.red ? s.stagedOrders.red : s.stagedOrders.red.filter((o) => o.id !== id),
        blue: s.roundReady.blue ? s.stagedOrders.blue : s.stagedOrders.blue.filter((o) => o.id !== id),
      };
      return { stagedOrders: next };
    }),
  clearStagedOrders: (team) =>
    set((s) => {
      if (team) {
        if (s.roundReady[team]) return s;
        return { stagedOrders: { ...s.stagedOrders, [team]: [] } };
      }
      const next: Record<PlayerTeam, StagedOrder[]> = {
        red: s.roundReady.red ? s.stagedOrders.red : [],
        blue: s.roundReady.blue ? s.stagedOrders.blue : [],
      };
      return { stagedOrders: next };
    }),
  setCartOpen: (open) => set({ cartOpen: open }),
  setRoundReady: (team, ready) =>
    set((s) => {
      if (!ready) {
        return { roundReady: { ...s.roundReady, [team]: false } };
      }
      const isActive = s.playerTeam === team;
      return {
        roundReady: { ...s.roundReady, [team]: true },
        actionDraft: isActive ? null : s.actionDraft,
        actionDraftToast: isActive ? null : s.actionDraftToast,
        groundMoveDrafts: isActive ? {} : s.groundMoveDrafts,
      };
    }),
  executeRound: async () => {
    const state = get();
    if (state.executing) return;
    if (!state.roundReady.red || !state.roundReady.blue) return;

    const batches = (["blue", "red"] as PlayerTeam[]).map((team) =>
      batchFromStaged(team, state.stagedOrders[team]),
    );
    const allOrders: StagedOrder[] = [
      ...state.stagedOrders.blue,
      ...state.stagedOrders.red,
    ];

    set({ executing: true, orderExecutionError: null });
    try {
      const result = await executeRound({ batches });
      if (!result.ok) {
        const failed = Object.values(result.outcomes_by_team)
          .flat()
          .filter((o) => !o.ok);
        const summary =
          failed.length === 0
            ? "Some orders were rejected."
            : failed.map((o) => `· ${o.message}`).join("\n");
        set({ executing: false, orderExecutionError: summary });
        return;
      }
      await animateMoveOrders(allOrders, set, get);
      const flatOutcomes = [
        ...(result.outcomes_by_team.blue ?? []),
        ...(result.outcomes_by_team.red ?? []),
      ];
      set((s) => ({
        scenario: result.snapshot,
        stagedOrders: emptyTeamMap<StagedOrder[]>(() => []),
        roundReady: { red: false, blue: false },
        unitPositionOverrides: {},
        unitPositionOverridesEpoch: s.unitPositionOverridesEpoch + 1,
        executing: false,
        lastExecutionResult: {
          at: Date.now(),
          outcomes: flatOutcomes,
          political_summary: result.political_summary,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ executing: false, orderExecutionError: message });
    }
  },
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
        lastExecutionResult: {
          at: Date.now(),
          outcomes: result.outcomes,
          political_summary: result.political_summary,
        },
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

/** Tween each position-changing order along its geodesic origin -> destination.
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
  const tweens: { unitId: string; from: [number, number]; to: [number, number] }[] = [];
  for (const o of orders) {
    if (o.kind === "move" || o.kind === "naval_move") {
      tweens.push({ unitId: o.unitId, from: o.origin, to: o.destination });
    } else if (o.kind === "rebase_air") {
      tweens.push({ unitId: o.unitId, from: o.origin, to: o.destination });
    }
  }
  if (tweens.length === 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / MOVE_ANIMATION_MS);
      const eased = easeInOutCubic(t);
      const overrides: Record<string, [number, number]> = {};
      for (const m of tweens) {
        overrides[m.unitId] = greatCircleInterpolate(m.from, m.to, eased);
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

// ---------------------------------------------------------------------------
// Staging helpers
// ---------------------------------------------------------------------------

type SetFn = (
  partial:
    | Partial<AppState>
    | ((s: AppState) => Partial<AppState>),
) => void;

/** Drop any prior staged order owned by the same unit/platform. One per slot. */
function dedupeByOwner(
  existing: StagedOrder[],
  incoming: StagedOrder,
): StagedOrder[] {
  const owner = ownerKey(incoming);
  if (!owner) return existing;
  return existing.filter((o) => ownerKey(o) !== owner);
}

function commitStaged(
  set: SetFn,
  team: PlayerTeam,
  order: StagedOrder,
): string | null {
  let committed = true;
  set((s) => {
    if (s.roundReady[team]) {
      committed = false;
      return s;
    }
    const filtered = dedupeByOwner(s.stagedOrders[team], order);
    return {
      stagedOrders: { ...s.stagedOrders, [team]: [...filtered, order] },
      cartOpen: true,
    };
  });
  return committed ? order.id : null;
}

interface TargetLookup {
  pos: [number, number];
  name: string;
}

function lookupTarget(
  sc: ScenarioSnapshot,
  kind: import("@/types/orders").StrikeTargetKindDTO,
  id: string,
): TargetLookup | null {
  switch (kind) {
    case "unit": {
      const u = sc.units.find((x) => x.id === id);
      return u ? { pos: [u.position[0], u.position[1]], name: u.name } : null;
    }
    case "depot": {
      const d = sc.depots.find((x) => x.id === id);
      return d ? { pos: [d.position[0], d.position[1]], name: d.name } : null;
    }
    case "airfield": {
      const a = sc.airfields.find((x) => x.id === id);
      return a ? { pos: [a.position[0], a.position[1]], name: a.name } : null;
    }
    case "naval_base": {
      const n = sc.naval_bases.find((x) => x.id === id);
      return n ? { pos: [n.position[0], n.position[1]], name: n.name } : null;
    }
    case "missile_range": {
      const m = sc.missile_ranges.find((x) => x.id === id);
      return m ? { pos: [m.origin[0], m.origin[1]], name: m.name } : null;
    }
    case "supply_line": {
      const s = sc.supply_lines.find((x) => x.id === id);
      if (!s) return null;
      return { pos: supplyLineMidpoint(s.path), name: s.name };
    }
    case "city": {
      const c = sc.cities.find((x) => x.id === id);
      return c ? { pos: [c.position[0], c.position[1]], name: c.name } : null;
    }
  }
}

function supplyLineMidpoint(path: [number, number][]): [number, number] {
  if (path.length === 0) return [0, 0];
  if (path.length === 1) return [path[0][0], path[0][1]];
  if (path.length % 2 === 1) {
    const m = path[(path.length - 1) / 2];
    return [m[0], m[1]];
  }
  const a = path[path.length / 2 - 1];
  const b = path[path.length / 2];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Map a confirmed action draft to a staged-order id by reusing the existing
 *  per-kind staging helpers on the store. Returns the staged id or null. */
function stagedFromActionDraft(
  d: ActionDraft,
  cand: ActionDraftCandidate,
  state: AppState,
): string | null {
  switch (d.kind) {
    case "engage":
      return state.stageEngageOrder(d.attackerId, cand.id);
    case "rebase_air":
      return state.stageRebaseAir(d.unitId, cand.id);
    case "air_sortie":
      return state.stageAirSortie(d.unitId, d.mission, {
        kind: candidateKindToStrike(cand.candidateKind),
        id: cand.id,
      });
    case "naval_move":
      return state.stageNavalMove(d.unitId, [cand.position[0], cand.position[1]]);
    case "naval_strike":
      return state.stageNavalStrike(d.unitId, {
        kind: candidateKindToStrike(cand.candidateKind),
        id: cand.id,
      });
    case "missile_strike":
      return state.stageMissileStrike(d.platformId, {
        kind: candidateKindToStrike(cand.candidateKind),
        id: cand.id,
      });
    case "interdict_supply":
      return state.stageInterdictSupply(d.platformKind, d.platformId, cand.id);
  }
}

function candidateKindToStrike(
  k: ActionDraftCandidate["candidateKind"],
): StrikeTargetKindDTO {
  return k as StrikeTargetKindDTO;
}
