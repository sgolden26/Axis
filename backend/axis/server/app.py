"""FastAPI app exposing the live theatre and order endpoints.

Routes:

- `GET  /api/health`           liveness probe.
- `GET  /api/state`            current snapshot in `state.json` shape.
- `POST /api/orders/execute`   apply an `OrderBatch`, return outcomes + new snapshot.

Wire format mirrors `axis.sim.orders.OrderBatch`:

```
{
  "issuer_team": "blue" | "red",
  "orders": [
    {"order_id": "...", "kind": "move", "unit_id": "...",
     "mode": "foot" | "vehicle", "destination": [lon, lat]}
  ]
}
```

The CORS middleware is permissive on purpose: this is a single-tenant demo.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


def _load_dotenv_once() -> None:
    """Tiny `KEY=VALUE` parser for `backend/.env` and the repo root `.env`.

    Runs at module import so `OPENAI_API_KEY` (and any sibling secrets) are
    visible to `axis.server.assistant` whether the server was started by
    `python -m axis serve` or by uvicorn's reloader subprocess. Existing
    environment variables always win.
    """
    here = Path(__file__).resolve()
    candidates = [
        here.parents[2] / ".env",          # backend/.env
        here.parents[3] / ".env",          # repo-root .env
        Path.cwd() / ".env",               # whatever cwd the user launched from
    ]
    for path in candidates:
        if not path.is_file():
            continue
        try:
            for raw in path.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
        except OSError:
            continue


_load_dotenv_once()

from axis.server.assistant import AssistantUnavailable, suggest_orders  # noqa: E402
from axis.server.state import TheaterStore, get_store  # noqa: E402
from axis.sim.orders import OrderBatch, OrderRegistry  # noqa: E402


def create_app(*, store: TheaterStore | None = None) -> FastAPI:
    app = FastAPI(title="Axis live theatre", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def _store() -> TheaterStore:
        return store if store is not None else get_store()

    @app.get("/api/health")
    def health() -> dict[str, Any]:
        return {"ok": True, "scenario_id": _store().scenario_id}

    @app.get("/api/state")
    def state() -> dict[str, Any]:
        return _store().snapshot_dict()

    @app.get("/api/signals")
    def signals() -> dict[str, Any]:
        """Political-layer slice: pressure, credibility, leader signals."""
        return _store().political_dict()

    @app.post("/api/orders/execute")
    def execute(payload: dict[str, Any]) -> dict[str, Any]:
        try:
            batch = OrderBatch.from_dict(payload)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        result, snapshot = _store().apply_batch(batch)
        return {
            "ok": result.ok,
            "outcomes": [o.to_dict() for o in result.outcomes],
            "political_summary": result.political_summary,
            "snapshot": snapshot,
        }

    @app.post("/api/orders/execute_round")
    def execute_round_endpoint(payload: dict[str, Any]) -> dict[str, Any]:
        """Hot-seat round: accepts {batches: [OrderBatch, OrderBatch]} and
        executes both teams' orders as one phased pass."""
        raw_batches = payload.get("batches")
        if not isinstance(raw_batches, list) or len(raw_batches) == 0:
            raise HTTPException(status_code=400, detail="batches must be a non-empty list")
        try:
            batches = [OrderBatch.from_dict(b) for b in raw_batches]
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        try:
            result, snapshot = _store().apply_round(batches)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {
            "ok": result.ok,
            "outcomes_by_team": {
                team: [o.to_dict() for o in outs]
                for team, outs in result.outcomes_by_team.items()
            },
            "political_summary": result.political_summary,
            "snapshot": snapshot,
        }

    @app.get("/api/orders/catalogue")
    def catalogue() -> dict[str, Any]:
        return {"orders": OrderRegistry.catalogue()}

    @app.post("/api/orders/suggest")
    def suggest(payload: dict[str, Any]) -> dict[str, Any]:
        """Convert a free-form intent into validated orders via OpenAI."""
        prompt = payload.get("prompt")
        issuer_team = payload.get("issuer_team")
        if not isinstance(prompt, str) or not prompt.strip():
            raise HTTPException(status_code=400, detail="prompt must be a non-empty string")
        if issuer_team not in ("red", "blue"):
            raise HTTPException(
                status_code=400, detail="issuer_team must be 'red' or 'blue'"
            )
        try:
            result = _store().with_theater(
                lambda theater: suggest_orders(
                    prompt=prompt, issuer_team=issuer_team, theater=theater,
                )
            )
        except AssistantUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return result

    @app.post("/api/reset")
    def reset() -> dict[str, Any]:
        _store().reset()
        return {"ok": True}

    return app


app = create_app()
