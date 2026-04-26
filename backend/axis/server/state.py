"""TheaterStore: thread-safe in-memory holder for the live scenario."""

from __future__ import annotations

import threading
from typing import Any

from axis import scenarios
from axis.domain.theater import Theater
from axis.serialization.snapshot import SnapshotExporter
from axis.sim.orders import (
    ExecutionResult,
    OrderBatch,
    RoundExecutionResult,
    execute_round,
)


class TheaterStore:
    """Owns the mutable Theater that the HTTP service exposes.

    A process-wide singleton (see `get_store`) is fine for the hackathon
    single-tenant demo. The lock guards the read/mutate cycle so concurrent
    requests cannot interleave a snapshot with a partial apply.
    """

    def __init__(self, scenario_id: str = "eastern_europe") -> None:
        self._scenario_id = scenario_id
        self._theater: Theater = scenarios.get(scenario_id)()
        self._lock = threading.RLock()

    @property
    def scenario_id(self) -> str:
        return self._scenario_id

    def reset(self) -> None:
        """Rebuild the theatre from the seed scenario, discarding mutations."""
        with self._lock:
            self._theater = scenarios.get(self._scenario_id)()

    def snapshot_dict(self) -> dict[str, Any]:
        with self._lock:
            return SnapshotExporter(self._theater).to_dict()

    def apply_batch(self, batch: OrderBatch) -> tuple[ExecutionResult, dict[str, Any]]:
        """Execute `batch` against the live theatre, returning result + snapshot."""
        with self._lock:
            result = batch.execute(self._theater)
            snapshot = SnapshotExporter(self._theater).to_dict()
            return result, snapshot

    def apply_round(
        self, batches: list[OrderBatch]
    ) -> tuple[RoundExecutionResult, dict[str, Any]]:
        """Execute a hot-seat round (multiple per-team batches) atomically."""
        with self._lock:
            result = execute_round(self._theater, batches)
            snapshot = SnapshotExporter(self._theater).to_dict()
            return result, snapshot


_store: TheaterStore | None = None
_store_lock = threading.Lock()


def get_store() -> TheaterStore:
    """Process-wide singleton. Lazy so tests can override before first use."""
    global _store
    if _store is None:
        with _store_lock:
            if _store is None:
                _store = TheaterStore()
    return _store


def set_store(store: TheaterStore | None) -> None:
    """Inject a store (mainly for tests)."""
    global _store
    with _store_lock:
        _store = store
