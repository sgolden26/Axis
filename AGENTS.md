# Project context

Axis is a hackathon entry for the SCSP Hackathon 2026 wargaming track. The aim is a modular wargaming platform that fuses a tactical layer (troop movement, kinetics, combat simulation) with a political layer (web-scraped sentiment, protest activity, leader pressure, troop morale) so that battlefield outcomes and strategic decisions react to live, public, unclassified signals. The visual language targets a Palantir/Maven feel: dark slate UI, hairline borders, mono-typography, faction-coded overlays on a real geographic map. The codebase is intentionally split into independent modules so two contributors can work in parallel and so the simulation engine and news/intel pipeline evolve without coupling.

## Stack

- Frontend: React + TypeScript (strict) + Tailwind + MapLibre GL + Zustand + Zod. Entry: `frontend/src/App.tsx`.
- Backend: Python 3.11+, OOP-first (ABC + factory + fluent builder), stdlib `dataclasses` for domain. Entry: `backend/axis/cli.py` (`python -m axis`).
- Contract: a single versioned `state.json` produced by the backend, validated by Zod on load. Schema lives in `docs/schema.md`.

## Repo map

- `backend/axis/domain/` immutable domain models (`Faction`, `City`, `Territory`, `Theater`, `Coordinate`).
- `backend/axis/units/` `Unit` ABC plus `InfantryBrigade`, `ArmouredBrigade`, `AirWing`, `NavalTaskGroup`.
- `backend/axis/factories/` `UnitFactory` (factory method) and `ScenarioBuilder` (fluent builder).
- `backend/axis/scenarios/` concrete scenario seeds; v1 only ships `eastern_europe` (Suwalki gap).
- `backend/axis/serialization/` `SnapshotExporter` (Theater -> JSON).
- `backend/axis/sim/`, `backend/axis/intel/`, `backend/axis/ai/` placeholder packages reserved for the simulation engine, GDELT/ACLED scraping plus sentiment/morale, and LLM red-cell/adjudicator agents respectively.
- `frontend/src/map/` MapLibre wrapper + per-feature layers (territory, cities, units).
- `frontend/src/ui/` HUD, CommandRail, Sidebar with `CityDetail` / `UnitDetail` / `TerritoryDetail`.
- `frontend/src/state/store.ts` Zustand store (selection + visible layers).
- `frontend/src/types/scenario.ts` Zod schemas mirroring the Python models.

## Status

v1 scope: frontend shell with selectable map entities, backend OOP scaffolding, JSON snapshot pipeline. The simulation engine and intel/news integration are deliberately stubbed; their packages exist with module docstrings describing the future contract so additive PRs do not need to touch the domain or scenario code.

## Conventions

- Coordinates are always `[lon, lat]` (GeoJSON / MapLibre order).
- Normalised metrics (`strength`, `readiness`, `morale`, `control`) are floats in `[0, 1]`.
- IDs are namespaced and stable: `city.*`, `unit.<faction>.*`, `terr.*`.
- The frontend must ignore unknown fields in `state.json` for forward compatibility.
- Bump `schema_version` in both Python and Zod mirrors in the same change for any breaking schema edit.
- Domain code never imports from `sim`/`intel`/`ai`; the dependency graph is one-way.

## Upkeep this file
If making changes to the codebase that changes anything in this file, please update it