"""Pure data models for the wargame. No simulation logic lives here."""

from axis.domain.coordinates import BoundingBox, Coordinate
from axis.domain.faction import Allegiance, Faction
from axis.domain.city import City, CityImportance
from axis.domain.territory import Territory
from axis.domain.theater import Theater

__all__ = [
    "Allegiance",
    "BoundingBox",
    "City",
    "CityImportance",
    "Coordinate",
    "Faction",
    "Territory",
    "Theater",
]
