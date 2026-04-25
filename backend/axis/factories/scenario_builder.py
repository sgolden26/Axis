"""ScenarioBuilder: fluent builder that assembles a Theater step by step."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Self

from axis.domain.city import City, CityImportance
from axis.domain.coordinates import BoundingBox, Coordinate
from axis.domain.country import Country
from axis.domain.faction import Allegiance, Faction
from axis.domain.territory import Territory
from axis.domain.theater import Theater
from axis.factories.unit_factory import UnitFactory
from axis.units.base import Unit
from axis.units.domain import UnitKind


class ScenarioBuilder:
    """Fluent builder for a `Theater`.

    Example:
        theater = (
            ScenarioBuilder("eastern_europe", "Suwalki Gap")
            .with_bbox(18.0, 52.0, 28.0, 56.5)
            .add_faction("nato", "NATO", Allegiance.BLUE, "#5aa9ff")
            .add_city("city.vilnius", "Vilnius", "nato", 25.28, 54.69, 588_000, "capital")
            .build()
        )
    """

    def __init__(self, scenario_id: str, name: str) -> None:
        self._id = scenario_id
        self._name = name
        self._classification = "UNCLASSIFIED // EXERCISE"
        self._clock: datetime = datetime.now(tz=timezone.utc)
        self._bbox: BoundingBox | None = None
        self._factions: list[Faction] = []
        self._countries: list[Country] = []
        self._cities: list[City] = []
        self._territories: list[Territory] = []
        self._units: list[Unit] = []

    def with_classification(self, classification: str) -> Self:
        self._classification = classification
        return self

    def with_clock(self, clock: datetime) -> Self:
        self._clock = clock
        return self

    def with_bbox(self, min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> Self:
        self._bbox = BoundingBox(min_lon, min_lat, max_lon, max_lat)
        return self

    def add_faction(
        self,
        id: str,
        name: str,
        allegiance: Allegiance,
        color: str,
    ) -> Self:
        self._factions.append(Faction(id=id, name=name, allegiance=allegiance, color=color))
        return self

    def add_country(self, country: Country) -> Self:
        """Attach a fully-built `Country` (typically pulled from a repository)."""
        self._countries.append(country)
        return self

    def add_city(
        self,
        id: str,
        name: str,
        faction_id: str,
        lon: float,
        lat: float,
        population: int,
        importance: str | CityImportance,
        infrastructure: tuple[str, ...] = (),
        country_id: str | None = None,
    ) -> Self:
        imp = importance if isinstance(importance, CityImportance) else CityImportance(importance)
        self._cities.append(
            City(
                id=id,
                name=name,
                faction_id=faction_id,
                position=Coordinate(lon=lon, lat=lat),
                population=population,
                importance=imp,
                infrastructure=tuple(infrastructure),
                country_id=country_id,
            )
        )
        return self

    def add_territory(
        self,
        id: str,
        name: str,
        faction_id: str,
        ring: list[tuple[float, float]],
        control: float = 1.0,
        country_id: str | None = None,
    ) -> Self:
        coords = tuple(Coordinate(lon=lon, lat=lat) for lon, lat in ring)
        self._territories.append(
            Territory(
                id=id,
                name=name,
                faction_id=faction_id,
                polygon=(coords,),
                control=control,
                country_id=country_id,
            )
        )
        return self

    def add_unit(
        self,
        *,
        kind: UnitKind,
        id: str,
        name: str,
        faction_id: str,
        lon: float,
        lat: float,
        strength: float = 1.0,
        readiness: float = 1.0,
        morale: float = 1.0,
        echelon: str | None = None,
        callsign: str = "",
        country_id: str | None = None,
        available_actions: tuple[str, ...] = (),
    ) -> Self:
        unit = UnitFactory.create(
            kind=kind,
            id=id,
            name=name,
            faction_id=faction_id,
            position=Coordinate(lon=lon, lat=lat),
            strength=strength,
            readiness=readiness,
            morale=morale,
            echelon=echelon,
            callsign=callsign,
            country_id=country_id,
            available_actions=available_actions,
        )
        self._units.append(unit)
        return self

    def build(self) -> Theater:
        if self._bbox is None:
            raise ValueError("ScenarioBuilder: bbox must be set via with_bbox()")
        theater = Theater(
            id=self._id,
            name=self._name,
            classification=self._classification,
            clock=self._clock,
            bbox=self._bbox,
            factions=list(self._factions),
            countries=list(self._countries),
            cities=list(self._cities),
            territories=list(self._territories),
            units=list(self._units),
        )
        theater.validate()
        return theater
