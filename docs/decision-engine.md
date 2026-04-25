# Decision engine

Maps a chosen `Action` against a `RegionIntel` to a probability of success
plus a human-readable breakdown. Implemented twice, once in Python
(`backend/axis/decision/evaluator.py`) and once in TypeScript
(`frontend/src/decision/evaluator.ts`). The TS copy must stay numerically in
lock-step with the Python copy; both consume the same `Action` blob exported
in `state.json`.

## Inputs

- `action: Action` — from `state.actions[]` (see [schema.md](./schema.md)).
- `region: RegionIntel` — from `intel.regions[]` (see [intel.md](./intel.md)).

## Formula

```
morale_norm    = (region.morale_score - 50) / 50              // -1..+1
trend_signed   = +1 if rising, -1 if declining, else 0
severity_norm  = clamp(sum(driver.contribution) / SEVERITY_DIVISOR, -1, +1)

p_morale       = morale_norm   * action.morale_weight
p_trend        = trend_signed  * action.trend_weight
p_severity     = severity_norm * action.severity_weight

p_categories   = sum over driver:
                   action.category_sensitivities[driver.category]
                   * clamp(abs(driver.contribution) / CONTRIBUTION_DIVISOR, 0, +1)

  // The driver contribution carries its own sign (e.g., protests are
  // negative for the controller). The catalog's `category_sensitivities`
  // value is signed from the *action*'s perspective: positive if the
  // category helps the action succeed, negative if it hurts. Multiplying
  // by the *magnitude* (not signed) of the contribution lets a single
  // sensitivity value cleanly express either direction.

probability    = clamp(
                   action.base_rate + p_morale + p_trend + p_severity + p_categories,
                   P_FLOOR, P_CEIL,
                 )
```

Constants (must match between FE and BE):

| Constant               | Value |
|------------------------|-------|
| `SEVERITY_DIVISOR`     | 12.0  |
| `CONTRIBUTION_DIVISOR` | 8.0   |
| `P_FLOOR`              | 0.05  |
| `P_CEIL`               | 0.95  |

## Output

```jsonc
{
  "action_id": "deploy_troops",
  "region_id": "terr.belarus_w",
  "probability": 0.48,
  "breakdown": [
    { "label": "base rate",            "kind": "base",     "delta": 0.65 },
    { "label": "morale",               "kind": "modifier", "delta": -0.10 },
    { "label": "declining trend",      "kind": "modifier", "delta": -0.05 },
    { "label": "protest activity",     "kind": "category", "delta": -0.03 },
    ...
  ],
  "explanation": "Reduced from 65% baseline by declining morale and sustained protest activity in Belarus (West)."
}
```

The explanation is templated from the largest-magnitude breakdown items.
Both implementations build it the same way.
