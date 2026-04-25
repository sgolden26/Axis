"""IntelPipeline: orchestrate source -> aggregator -> snapshot."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from axis import INTEL_SCHEMA_VERSION
from axis.intel.morale import IntelSnapshot, aggregate_all
from axis.intel.sources import (
    CuratedSource,
    GdeltLiveSource,
    GdeltSnapshotSource,
    IntelSource,
)


@dataclass(slots=True)
class IntelPipeline:
    """Build an IntelSnapshot for a fixed set of regions."""

    source: IntelSource
    region_ids: tuple[str, ...]

    def run(self, *, now: datetime | None = None, tick_seq: int = 0) -> IntelSnapshot:
        now = now or datetime.now(tz=timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        events = self.source.fetch(now)
        regions = aggregate_all(self.region_ids, events, now=now)
        return IntelSnapshot(
            intel_schema_version=INTEL_SCHEMA_VERSION,
            generated_at=now,
            source=self.source.name,
            tick_seq=tick_seq,
            regions=tuple(regions),
        )

    def write(
        self,
        path: Path | str,
        *,
        now: datetime | None = None,
        tick_seq: int = 0,
        indent: int = 2,
    ) -> Path:
        snapshot = self.run(now=now, tick_seq=tick_seq)
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(snapshot.to_dict(), indent=indent) + "\n")
        return out


_DEFAULT_DATA_DIR = Path(__file__).resolve().parents[3] / "data" / "intel"


def build_source(kind: str, *, data_dir: Path | None = None) -> IntelSource:
    """Construct a concrete IntelSource by name. Default paths point at
    `data/intel/` checked into the repo."""
    base = data_dir or _DEFAULT_DATA_DIR
    if kind == "curated":
        return CuratedSource(base / "curated_events.json")
    if kind == "gdelt_snapshot":
        return GdeltSnapshotSource(base / "gdelt" / "events.jsonl")
    if kind == "gdelt_live":
        return GdeltLiveSource()
    raise ValueError(
        f"Unknown intel source {kind!r}. Expected one of: curated, gdelt_snapshot, gdelt_live."
    )


def default_region_ids() -> Iterable[str]:
    """Region ids the eastern_europe scenario expects intel for."""
    return (
        "terr.lithuania",
        "terr.poland_ne",
        "terr.kaliningrad",
        "terr.belarus_w",
    )
