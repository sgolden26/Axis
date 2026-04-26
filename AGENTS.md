# Project context

Axis is a hackathon entry for the SCSP Hackathon 2026 wargaming track. The aim is a modular wargaming platform that fuses a tactical layer (troop movement, kinetics, combat simulation) with a political layer (web-scraped sentiment, protest activity, leader pressure, troop morale) so that battlefield outcomes and strategic decisions react to live, public, unclassified signals. The visual language targets a Palantir/Maven feel: dark slate UI, hairline borders, mono-typography, faction-coded overlays on a real geographic map. The codebase is intentionally split into independent modules so two contributors can work in parallel and so the simulation engine and news/intel pipeline evolve without coupling.

## Stack

- Frontend: React + TypeScript (strict) + Tailwind + MapLibre GL + Zustand + Zod. Entry: `frontend/src/App.tsx`.
- Backend: Python 3.11+, OOP-first (ABC + factory + fluent builder), stdlib `dataclasses` for domain. Entry: `backend/axis/cli.py` (`python -m axis`).
- Contract: a single versioned `state.json` produced by the backend, validated by Zod on load. Schema lives in `docs/schema.md`.

## Repo map

- `backend/axis/domain/` immutable domain models (`Faction`, `Country` + nested dimension dataclasses, `City`, `Territory`, `Oblast`, `Frontline`, military_assets (`Depot`, `Airfield`, `NavalBase`, `BorderCrossing`, `SupplyLine`, `IsrCoverage`, `MissileRange`, `AreaOfResponsibility`), `Theater`, `Coordinate`).
- `backend/axis/domain/countries/` `CountryRepository` ABC plus `StubCountryRepository` (hand-authored dossiers); plug-in point for future GDELT/Factbook/IISS adapters.
- `backend/axis/units/` `Unit` ABC plus `InfantryBrigade`, `ArmouredBrigade`, `AirWing`, `NavalTaskGroup`.
- `backend/axis/factories/` `UnitFactory` (factory method) and `ScenarioBuilder` (fluent builder, with `add_*` for every entity kind including oblasts, depots, airfields, naval bases, crossings, supply lines, ISR, missile arcs, AORs, frontlines).
- `backend/axis/scenarios/` concrete scenario seeds; v1 ships `eastern_europe` rebranded as a Russia/Ukraine theatre.
- `backend/axis/serialization/` `SnapshotExporter` (Theater -> JSON).
- `backend/axis/sim/orders.py` polymorphic `Order` ABC, `OrderRegistry`, and `OrderBatch` (validate-all, then phased apply-all with seeded `BatchRng`). Concrete kinds: `MoveOrder`, `EntrenchOrder`, `EngageOrder`, `RebaseAirOrder`, `AirSortieOrder`, `NavalMoveOrder`, `NavalStrikeOrder`, `MissileStrikeOrder`, `ResupplyOrder`, `InterdictSupplyOrder`. New kinds register against the same registry without touching the HTTP layer.
- `backend/axis/sim/combat.py` stochastic-simple combat, range tables (`engagement_range_km`, `AIR_SORTIE_RADIUS_KM`, `AIR_REBASE_RADIUS_KM`, `NAVAL_MOVE_RADIUS_KM`), `haversine_km`, `is_target_detected` (range + ISR / self-detect), and the `PoliticalLedger` rollup that nudges `Country` opinion dimensions and `Oblast` control after kinetic outcomes.
- `backend/axis/server/` FastAPI app + `TheaterStore` singleton. `python -m axis serve` runs uvicorn; FE dev proxies `/api` to it. Endpoints: `GET /api/state`, `POST /api/orders/execute` (single-team batch), `POST /api/orders/execute_round` (hot-seat: multiple per-team batches validated independently then applied in one phased pass with a shared `BatchRng`), `POST /api/reset`. The CLI `export` path remains unchanged for the static demo workflow.
- `backend/axis/intel/`, `backend/axis/ai/` placeholder packages reserved for GDELT/ACLED scraping plus sentiment/morale, and LLM red-cell/adjudicator agents respectively.
- `frontend/public/borders/` static Natural Earth GeoJSON: admin-0 primary (RU/UA/BY/PL/MD/RO/GE), admin-0 context ring, admin-1 Ukrainian oblasts + Crimea/Sevastopol.
- `frontend/src/map/` MapLibre wrapper, layer modules per kind (territory, cities, units, oblast, country, asset, coverage, frontline, supply, missile range fill/line, `actionDraftOverlay` for in-progress action drafts), `mapRef.ts` singleton, and `geo.ts` geospatial primitives.
- `frontend/src/ui/` HUD, `LeftDock` (FilterChips with a `missile_ranges` chip + OOBTree), `RightPanel` (Context tab / Decision tab: docked `DecisionEngine` plus full-screen `DecisionImmersive` with a client-built factor flow graph from `intel` + outcome estimate), CountryRoster, Bottom bar (MeasureTool, Bookmarks, EventTicker), Minimap, HoverCard, KeyboardShortcuts. Sidebar holds the per-kind detail panels for every selectable entity (city, unit, territory, country, oblast, depot, airfield, naval base, crossing, supply, ISR, missile, AOR, frontline). `UnitDetail` and `AssetDetails` (depot, missile) render concrete action buttons (move, engage, entrench, rebase, sortie, naval move/strike, missile strike, interdict, request resupply); shared primitives `ActionDraftPanel` and `ResupplyPicker` live in `Sidebar/primitives/`.
- `frontend/src/state/store.ts` Zustand store (selection, hover, visible layers, right tab, left/right panel open, `decisionImmersiveOpen`, OOB expansion, bookmarks, measure path, ticker pause, help overlay, choropleth metric, `playerTeam` red/blue for order gating, per-team `stagedOrders` cart, per-team `roundReady` lock for hot-seat staging, `cartOpen`, `executing`, `unitPositionOverrides` for the move/rebase/naval-move animator, `actionDraft` + `actionDraftToast` for map-pick draft flows). `frontend/src/state/playerTeam.ts` exports `PlayerTeam` and `isFactionControllableByPlayerTeam` vs `Faction.allegiance`. `frontend/src/state/orders.ts` defines the `StagedOrder` discriminated union and DTO mapping; new order kinds extend the union and add a builder. `frontend/src/state/actionDraft.ts` defines the `ActionDraft` types, mirrored range tables, candidate enumeration, and frontend `isTargetDetected` parity for engage/sortie/naval-strike/missile-strike/rebase/naval-move/interdict drafts. The store's `executeRound` action posts both teams' batches to `/api/orders/execute_round` only when both `roundReady` flags are set; while a team is Ready, its staging mutators (start*Draft, stage*, removeStagedOrder, clearStagedOrders) become no-ops.
- `frontend/src/types/` Zod schemas mirroring the Python models (`scenario.ts`, `country.ts`, `oblast.ts`, `frontline.ts`, `military_assets.ts`, `orders.ts`).
- `frontend/src/ui/Orders/OrdersCart.tsx` top-right floating cart of staged orders for the active team. Footer hosts the hot-seat soft toggle: Ready / Unready per team, an at-a-glance "you · other team" status line, and a single `Execute round` button that lights up only when both teams are Ready. `frontend/src/api/executeOrders.ts` POSTs a single `OrderBatchDTO` to `/api/orders/execute`; `frontend/src/api/executeRound.ts` POSTs `{batches: [OrderBatchDTO, OrderBatchDTO]}` to `/api/orders/execute_round` for the hot-seat round.

## Status

Schema v0.4.0. Frontend shell with the full Maven-style chrome (left dock, right panel with tabs, bottom ticker, minimap, measure tool, bookmarks, hover card, keyboard shortcuts) plus a top-right Orders cart that stages a full action set per team (ground move, engage, entrench, air rebase / sortie, naval move / strike, missile strike, interdict supply, request resupply) via map-pick drafts and animates kinetic outcomes on Execute. Backend ships the OOP scaffolding (snapshot exporter), the polymorphic `Order`/`OrderBatch` model with seeded stochastic-simple combat and a political-rollup ledger, and a FastAPI live-theatre service (`python -m axis serve`) the FE talks to via `/api`. The static `axis export` path still works as a fallback. Intel/news integration and the wider simulation engine are deliberately stubbed.

## Conventions

- Coordinates are always `[lon, lat]` (GeoJSON / MapLibre order).
- Normalised metrics (`strength`, `readiness`, `morale`, `control`, country dimension scalars) are floats in `[0, 1]`. Bilateral relation scores are signed in `[-1, +1]`.
- IDs are namespaced and stable: `city.*`, `unit.<faction>.*`, `terr.*`, `oblast.<iso>.*`, `depot.*`, `afld.*`, `nbase.*`, `cross.*`, `supply.*`, `isr.*`, `msl.*`, `aor.*`, `front.*`. Country ids are short ISO-style slugs (`ru`, `ua`, `by`).
- `country_id` on `City`, `Territory`, `Unit` is optional. Alliance-only entities omit it.
- Oblasts carry `iso_3166_2` (e.g. `UA-46`) for join with the admin-1 GeoJSON.
- `available_actions` on every entity (Unit, Country, Oblast, asset, etc.) is a list of affordance ids; v1 renders them as disabled buttons.
- The frontend must ignore unknown fields in `state.json` for forward compatibility.
- Bump `schema_version` in both Python and Zod mirrors in the same change for any breaking schema edit.
- Domain code never imports from `sim`/`intel`/`ai`; the dependency graph is one-way. Country data flows from a `CountryRepository` so adapters can swap without touching scenarios.

## Upkeep this file
If making changes to the codebase that changes anything in this file, please update it