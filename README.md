# Axis

A modular wargaming platform combining tactical simulation (troop movement, kinetics, combat) with political dynamics (sentiment scraping, morale, leader reactions). SCSP Hackathon 2026 - Wargaming track.

## Status

v1: frontend shell with MapLibre theatre map, Python OOP scenario builder, JSON snapshot pipeline. Simulation engine and news/intel integration are stubbed for follow-up PRs.

## Repo layout

```
Axis/
  backend/    # Python OOP domain + scenario builder + snapshot exporter
  frontend/   # React + TS + Tailwind + MapLibre dark-themed UI
  data/       # generated state.json snapshots (gitignored, sample committed)
  docs/       # shared FE/BE data contract
```

## Run it

Backend (export a scenario snapshot):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
python -m axis export --scenario eastern_europe --out ../data/state.json
```

Frontend (dev server on http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

`npm run dev` runs a `predev` step that copies `data/state.json` into `frontend/public/state.json`.

## Architecture

- Single source of truth: a versioned `state.json` produced by the Python backend, validated with zod on the frontend. See [docs/schema.md](docs/schema.md).
- Backend uses ABC + concrete subclasses for `Unit`, a `UnitFactory` factory method, and a fluent `ScenarioBuilder`. Sim/intel/AI packages are placeholders with READMEs describing the intended interfaces.
- Frontend uses MapLibre GL with the CARTO dark-matter style, Zustand for selection/layer state, and a Palantir/Maven-influenced visual language.

## Tracks and scope

Wargaming track. v1 is deliberately small: one scenario (Suwalki gap), four unit types, click-to-select interaction. The architecture is set up for additive PRs.
