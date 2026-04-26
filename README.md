# Axis

A modular wargaming platform combining tactical simulation (troop movement, kinetics, combat) with political dynamics (sentiment scraping, morale, leader reactions). SCSP Hackathon 2026 - Wargaming track.

## Status

Schema v0.4.0. Russia/Ukraine theatre with deeply-modelled country dossiers (government, military, nuclear posture, demographics, diplomacy, energy/logistics, public opinion, geography), Ukrainian admin-1 oblasts, ~150 units, depots, airfields, naval bases, supply lines, ISR coverage fans, missile range arcs, areas of responsibility, an animated frontline trace, and border crossings. Maven-style frontend chrome: collapsible left dock with filter chips and OOB tree, right panel with Context and Decision tabs, hover preview cards, bottom event ticker, minimap, measure tool, bookmarks bar, keyboard shortcuts (`[`, `]`, `Esc`, `M`, `B`, `?`). Simulation engine and news/intel integration are stubbed for follow-up PRs.

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

`npm run dev` runs a `predev` step that copies `data/state.json` and `data/intel.json` into `frontend/public/`.

### Live news (optional)

The intel layer can pull from the live GDELT 2.0 DOC API instead of the
curated/frozen datasets. It is off by default; flip it on with:

```bash
python -m axis settings live-news on
python -m axis intel tick --source auto --interval 30   # rewrites intel.json on a loop
```

Toggle off any time with `python -m axis settings live-news off`. See
[docs/intel.md](docs/intel.md) for the full settings list and live-source
behaviour. The frontend polls `intel.json` and is unchanged.

## Architecture

- Single source of truth: a versioned `state.json` produced by the Python backend, validated with zod on the frontend. See [docs/schema.md](docs/schema.md).
- Backend uses ABC + concrete subclasses for `Unit`, a `UnitFactory` factory method, and a fluent `ScenarioBuilder`. Sim/intel/AI packages are placeholders with READMEs describing the intended interfaces.
- Frontend uses MapLibre GL with the CARTO dark-matter style, Zustand for selection/layer state, and a Palantir/Maven-influenced visual language.

## Tracks and scope

Wargaming track. v1 ships a single Russia/Ukraine theatre and four unit types with click-to-select, hover-to-preview, and a full Maven-style chrome. The architecture is set up for additive PRs.
