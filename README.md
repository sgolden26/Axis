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

### One-time: Python env and data export

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
python -m axis export --scenario eastern_europe --out ../data/state.json
```

`pip install -e .` pulls in the HTTP stack (`fastapi`, `uvicorn`) used by the live theatre service below.

### Interactive orders (live API + Vite)

The app can load state from a running backend and apply staged move orders. Run both processes (two terminals).

**Backend** (FastAPI on http://127.0.0.1:8000, in-memory theatre):

```bash
cd backend
source .venv/bin/activate
python -m axis serve
```

Useful options: `python -m axis serve --port 8000` (default), `python -m axis serve --host 0.0.0.0` to bind on all interfaces.

**Frontend** (Vite on http://localhost:5173, proxies `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

In dev, the UI prefers `GET /api/state` and `POST /api/orders/execute` via the proxy. If the backend is not running, the app falls back to the static `state.json` (see below).

To reset the in-memory scenario after running orders: `POST http://127.0.0.1:8000/api/reset` (or restart `axis serve`).

### Static only (no backend)

If you only need the map and data, skip `axis serve` and point the app at the exported file. `npm run dev` runs a `predev` step that copies `data/state.json` and `data/intel.json` into `frontend/public/`, and Vite can also read live files from `../data/` in dev. Without the server, order execution is unavailable.

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
