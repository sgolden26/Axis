"""Theater: the aggregate root that owns all entities for a single scenario."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING

from axis.domain.city import City
from axis.domain.coordinates import BoundingBox
from axis.domain.faction import Faction
from axis.domain.territory import Territory

if TYPE_CHECKING:
    from axis.units.base import Unit


@dataclass(slots=True)
class Theater:
    """The world state for a scenario at a point in time.

    Holds factions, cities, territories and units. Lookup by id is supported
    via the helper methods. Future sim/intel layers will mutate this object
    (or produce a new one), but v1 treats it as immutable after build.
    """

    id: str
    name: str
    classification: str
    clock: datetime
    bbox: BoundingBox
    factions: list[Faction] = field(default_factory=list)
    cities: list[City] = field(default_factory=list)
    territories: list[Territory] = field(default_factory=list)
    units: "list[Unit]" = field(default_factory=list)

    def faction(self, faction_id: str) -> Faction:
        for f in self.factions:
            if f.id == faction_id:
                return f
        raise KeyError(f"Unknown faction: {faction_id}")

    def validate(self) -> None:
        """Check referential integrity. Raises on first inconsistency."""
        ids = {f.id for f in self.factions}
        for city in self.cities:
            if city.faction_id not in ids:
                raise ValueError(f"City {city.id} references unknown faction {city.faction_id}")
        for terr in self.territories:
            if terr.faction_id not in ids:
                raise ValueError(
                    f"Territory {terr.id} references unknown faction {terr.faction_id}"
                )
        for unit in self.units:
            if unit.faction_id not in ids:
                raise ValueError(f"Unit {unit.id} references unknown faction {unit.faction_id}")
