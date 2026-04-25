# Intel snapshot schema (`intel.json`)

The dynamic, refreshable signal layer. Lives next to `state.json` and is
re-written on every backend tick. The frontend polls it on a timer to feel
"live" without needing a server.

Mirrored by:

- Python: `backend/axis/intel/*`, written by `backend/axis/intel/pipeline.py`.
- TypeScript: `frontend/src/types/intel.ts` (zod-validated on load).

Bump `intel_schema_version` on any breaking change and update both mirrors
in the same PR.

## Top level

```jsonc
{
  "intel_schema_version": "0.1.0",
  "generated_at": "2026-04-25T18:00:00Z",  // ISO timestamp of this snapshot
  "source": "curated",                        // curated | gdelt_snapshot | gdelt_live
  "tick_seq": 17,                             // monotonic counter for live mode
  "regions": [RegionIntel, ...]
}
```

## RegionIntel

```jsonc
{
  "region_id": "terr.lithuania",   // matches a Territory.id from state.json
  "morale_score": 78,                // 0..100 (display units)
  "morale_trend": "steady",          // rising | steady | declining
  "trend_delta": 0.5,                // signed change vs prior window, in score units
  "history": [76, 77, 78, 78, 78, 78], // last N samples, oldest -> newest
  "drivers": [Driver, ...],          // top 3 categories by absolute contribution
  "recent_events": [Event, ...]      // most recent / most influential events for this region
}
```

## Driver

```jsonc
{
  "category": "protest",      // EventCategory
  "contribution": -8.4,        // signed score units after decay aggregation
  "headline": "Mass protests in Grodno over conscription orders",
  "event_id": "evt.belw.001"
}
```

## Event

```jsonc
{
  "id": "evt.belw.001",
  "region_id": "terr.belarus_w",
  "ts": "2026-04-24T16:30:00Z",
  "category": "protest",       // protest | military_loss | economic_stress | political_instability | nationalist_sentiment
  "headline": "Mass protests in Grodno over conscription orders",
  "snippet": "Several thousand demonstrators gathered in central Grodno...",
  "weight": -0.55,              // signed [-1, 1]
  "source": "curated"           // curated | gdelt | manual
}
```

## Category conventions

Events are signed from the perspective of the *controlling faction* of the
region. Default conventions:

| Category                | Default sign |
|-------------------------|--------------|
| protest                 | negative     |
| military_loss           | negative     |
| economic_stress         | negative     |
| political_instability   | negative     |
| nationalist_sentiment   | positive     |

The aggregator does not enforce sign; events can override (a *successful*
recruitment drive could be `military_loss: +0.4`).

## Aggregation

Per region:

```
raw       = sum(event.weight * exp(-(now - event.ts) / half_life))
score_raw = clamp(50 + raw * SCALE, 0, 100)
```

with `half_life = 24h` and `SCALE = 20`.

Trend is computed by re-running the same aggregator with `now -= window`
(default `window = 12h`) and comparing:

- `trend_delta = score_now - score_then`
- `rising` if `>= +1.5`, `declining` if `<= -1.5`, else `steady`.

History is the last 6 samples taken at `window` intervals walking
backward from `now`.

## Sources

The pipeline picks one `IntelSource` implementation:

- `curated` — `data/intel/curated_events.json`, hand-authored events.
- `gdelt_snapshot` — frozen GDELT extract under `data/intel/gdelt/`.
- `gdelt_live` — real-time GDELT 2.0 client (stub for v0.2; flips on later).

All three implement the same `IntelSource` ABC, so swapping is a flag:

```bash
python -m axis intel export --source curated         --out ../data/intel.json
python -m axis intel export --source gdelt_snapshot  --out ../data/intel.json
python -m axis intel tick   --source curated --interval 5
```
