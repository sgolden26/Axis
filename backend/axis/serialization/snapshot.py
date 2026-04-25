"""SnapshotExporter: walk a Theater into the JSON shape defined in docs/schema.md."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from axis import SCHEMA_VERSION
from axis.domain.city import City
from axis.domain.faction import Faction
from axis.domain.territory import Territory
from axis.domain.theater import Theater
from axis.units.base import Unit


class SnapshotExporter:
    """Convert a `Theater` into a JSON-serialisable dict matching the schema."""

    def __init__(self, theater: Theater) -> None:
        self._theater = theater

    def to_dict(self) -> dict[str, Any]:
        t = self._theater
        return {
            "schema_version": SCHEMA_VERSION,
            "scenario": {
                "id": t.id,
                "name": t.name,
                "classification": t.classification,
                "clock": t.clock.isoformat(),
                "bbox": list(t.bbox.as_tuple()),
            },
            "factions": [self._faction(f) for f in t.factions],
            "cities": [self._city(c) for c in t.cities],
            "territories": [self._territory(p) for p in t.territories],
            "units": [self._unit(u) for u in t.units],
        }

    def write(self, path: Path | str, *, indent: int = 2) -> Path:
        out_path = Path(path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(self.to_dict(), indent=indent) + "\n")
        return out_path

    @staticmethod
    def _faction(f: Faction) -> dict[str, Any]:
        return {
            "id": f.id,
            "name": f.name,
            "allegiance": f.allegiance.value,
            "color": f.color,
        }

    @staticmethod
    def _city(c: City) -> dict[str, Any]:
        return {
            "id": c.id,
            "name": c.name,
            "faction_id": c.faction_id,
            "position": [c.position.lon, c.position.lat],
            "population": c.population,
            "importance": c.importance.value,
            "infrastructure": list(c.infrastructure),
        }

    @staticmethod
    def _territory(t: Territory) -> dict[str, Any]:
        return {
            "id": t.id,
            "name": t.name,
            "faction_id": t.faction_id,
            "polygon": [
                [[pt.lon, pt.lat] for pt in ring] for ring in t.polygon
            ],
            "control": t.control,
        }

    @staticmethod
    def _unit(u: Unit) -> dict[str, Any]:
        return {
            "id": u.id,
            "name": u.name,
            "faction_id": u.faction_id,
            "domain": u.domain.value,
            "kind": u.kind.value,
            "position": [u.position.lon, u.position.lat],
            "strength": u.strength,
            "readiness": u.readiness,
            "morale": u.morale,
            "echelon": u.echelon,
            "callsign": u.callsign,
        }
