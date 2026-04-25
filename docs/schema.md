# Scenario snapshot schema

Single source of truth for the FE/BE contract. Mirrored by:

- Python: `backend/axis/domain/*` (pydantic) plus `backend/axis/serialization/snapshot.py`
- TypeScript: `frontend/src/types/scenario.ts` (zod, runtime-validated on load)

The backend produces `data/state.json`; the frontend reads `public/state.json`. Bump `schema_version` on any breaking change and update both mirrors in the same PR.

## Top level

```jsonc
{
  "schema_version": "0.1.0",
  "scenario": {
    "id": "eastern_europe",
    "name": "Suwalki Gap",
    "classification": "UNCLASSIFIED // EXERCISE",
    "clock": "2026-04-25T11:00:00Z",
    "bbox": [18.0, 52.0, 28.0, 56.5]   // [minLon, minLat, maxLon, maxLat]
  },
  "factions": [Faction, ...],
  "cities": [City, ...],
  "territories": [Territory, ...],
  "units": [Unit, ...]
}
```

## Faction

```jsonc
{
  "id": "nato",
  "name": "NATO",
  "allegiance": "blue",        // blue | red | neutral
  "color": "#5aa9ff"
}
```

## City

```jsonc
{
  "id": "city.vilnius",
  "name": "Vilnius",
  "faction_id": "nato",
  "position": [25.2797, 54.6872],   // [lon, lat]
  "population": 588000,
  "importance": "capital",          // capital | major | minor
  "infrastructure": ["air_base", "rail_hub"]
}
```

## Territory

```jsonc
{
  "id": "terr.lithuania",
  "name": "Lithuania",
  "faction_id": "nato",
  "polygon": [[[lon, lat], ...]],   // GeoJSON Polygon coordinates (single ring)
  "control": 0.95                    // 0..1 share of effective control
}
```

## Unit

```jsonc
{
  "id": "unit.nato.armd-1",
  "name": "1st Armoured Bde",
  "faction_id": "nato",
  "domain": "ground",                  // ground | air | naval
  "kind": "armoured_brigade",          // infantry_brigade | armoured_brigade | air_wing | naval_task_group
  "position": [22.6, 54.4],
  "strength": 0.92,                    // 0..1
  "readiness": 0.78,                   // 0..1
  "morale": 0.81,                      // 0..1 (stub, will be driven by intel layer later)
  "echelon": "brigade",
  "callsign": "IRON-1"
}
```

## Conventions

- Coordinates are always `[lon, lat]` to match GeoJSON / MapLibre.
- All floats in `[0, 1]` are normalised intensity / share scores.
- IDs are namespaced (`city.*`, `unit.<faction>.*`, `terr.*`) and stable across exports of the same scenario.
- Unknown fields must be ignored by the frontend (forward-compatible).
