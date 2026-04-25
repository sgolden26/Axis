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
- `gdelt_live` — real-time GDELT 2.0 DOC API client. Per-region keyword
  queries → title classifier → signed weight per `EventCategory`. Pure
  stdlib (`urllib`), no API key required.

All implement the same `IntelSource` ABC. The CLI exposes a fourth
selection, `auto`, which obeys the `live_news_enabled` setting (see below):

```bash
python -m axis intel export --source curated         --out ../data/intel.json
python -m axis intel export --source gdelt_snapshot  --out ../data/intel.json
python -m axis intel export --source gdelt_live      --out ../data/intel.json
python -m axis intel export --source auto            --out ../data/intel.json
python -m axis intel tick   --source auto --interval 30
```

When `gdelt_live` is selected (directly or through `auto`), the source is
wrapped in a fallback: if the live fetch raises (network blip, GDELT
rate-limit, etc) the pipeline silently falls back to
`settings.live_fallback_source` (default `curated`) for that tick. The
snapshot's `source` field reports which source actually produced the
events so the FE can surface "live (fallback)" if needed.

## Live-news toggle

Live web scraping is gated on a backend setting so a long-running
`intel tick` loop can be flipped between offline and live without
restarting:

```bash
python -m axis settings show                  # print current values
python -m axis settings live-news on          # enable GDELT live
python -m axis settings live-news off         # disable
python -m axis settings live-news status

python -m axis settings set gdelt_lookback_hours 24
python -m axis settings set gdelt_max_records_per_region 50
python -m axis settings set gdelt_min_abs_tone 1.5
```

Settings persist to `data/backend_settings.json` (gitignored). Defaults:

| Key                            | Default   | Notes                                    |
|--------------------------------|-----------|------------------------------------------|
| `live_news_enabled`            | `false`   | Master switch for the GDELT live source. |
| `gdelt_lookback_hours`         | `48`      | Query timespan per region.               |
| `gdelt_max_records_per_region` | `75`      | DOC API caps at 250.                     |
| `gdelt_min_abs_tone`           | `1.0`     | Drop near-neutral wire copy.             |
| `gdelt_request_timeout_s`      | `10.0`    | HTTP timeout per region call.            |
| `live_fallback_source`         | `curated` | Used when a live fetch fails.            |

`intel tick` re-reads the settings file on every tick (default) so toggling
`live-news on/off` takes effect on the next tick without a restart.
