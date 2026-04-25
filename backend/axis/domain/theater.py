"""Theater: the aggregate root that owns all entities for a single scenario."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING

from axis.domain.city import City
from axis.domain.coordinates import BoundingBox
from axis.domain.country import Country
from axis.domain.faction import Faction
from axis.domain.territory import Territory

if TYPE_CHECKING:
    from axis.units.base import Unit


@dataclass(slots=True)
class Theater:
    """The world state for a scenario at a point in time.

    Holds factions, countries, cities, territories and units. Lookup by id is
    supported via helper methods. Future sim/intel layers will mutate this
    object (or produce a new one), but v1 treats it as immutable after build.
    """

    id: str
    name: str
    classification: str
    clock: datetime
    bbox: BoundingBox
    factions: list[Faction] = field(default_factory=list)
    countries: list[Country] = field(default_factory=list)
    cities: list[City] = field(default_factory=list)
    territories: list[Territory] = field(default_factory=list)
    units: "list[Unit]" = field(default_factory=list)

    def faction(self, faction_id: str) -> Faction:
        for f in self.factions:
            if f.id == faction_id:
                return f
        raise KeyError(f"Unknown faction: {faction_id}")

    def country(self, country_id: str) -> Country:
        for c in self.countries:
            if c.id == country_id:
                return c
        raise KeyError(f"Unknown country: {country_id}")

    def validate(self) -> None:
        """Check referential integrity. Raises on first inconsistency."""
        faction_ids = {f.id for f in self.factions}
        country_ids = {c.id for c in self.countries}
        for country in self.countries:
            if country.faction_id not in faction_ids:
                raise ValueError(
                    f"Country {country.id} references unknown faction {country.faction_id}"
                )
            if country.capital_city_id is not None:
                if country.capital_city_id not in {c.id for c in self.cities}:
                    raise ValueError(
                        f"Country {country.id} capital_city_id {country.capital_city_id} "
                        "is not in cities"
                    )
        for city in self.cities:
            if city.faction_id not in faction_ids:
                raise ValueError(f"City {city.id} references unknown faction {city.faction_id}")
            if city.country_id is not None and city.country_id not in country_ids:
                raise ValueError(
                    f"City {city.id} references unknown country {city.country_id}"
                )
        for terr in self.territories:
            if terr.faction_id not in faction_ids:
                raise ValueError(
                    f"Territory {terr.id} references unknown faction {terr.faction_id}"
                )
            if terr.country_id is not None and terr.country_id not in country_ids:
                raise ValueError(
                    f"Territory {terr.id} references unknown country {terr.country_id}"
                )
        for unit in self.units:
            if unit.faction_id not in faction_ids:
                raise ValueError(f"Unit {unit.id} references unknown faction {unit.faction_id}")
            if unit.country_id is not None and unit.country_id not in country_ids:
                raise ValueError(
                    f"Unit {unit.id} references unknown country {unit.country_id}"
                )
