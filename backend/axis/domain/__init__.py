"""Pure data models for the wargame. No simulation logic lives here."""

from axis.domain.coordinates import BoundingBox, Coordinate
from axis.domain.country import (
    BilateralRelation,
    Border,
    CabinetMember,
    Composition,
    Country,
    Demographics,
    Diplomacy,
    EnergyLogistics,
    Geography,
    Government,
    InventoryLine,
    InventoryStatus,
    KeyBase,
    Military,
    MilitaryPosture,
    NuclearPosture,
    NuclearStatus,
    PublicOpinion,
    RegimeType,
    RelationStatus,
    ServiceBranch,
    Treaty,
)
from axis.domain.faction import Allegiance, Faction
from axis.domain.city import City, CityImportance
from axis.domain.territory import Territory
from axis.domain.theater import Theater

__all__ = [
    "Allegiance",
    "BilateralRelation",
    "Border",
    "BoundingBox",
    "CabinetMember",
    "City",
    "CityImportance",
    "Composition",
    "Coordinate",
    "Country",
    "Demographics",
    "Diplomacy",
    "EnergyLogistics",
    "Faction",
    "Geography",
    "Government",
    "InventoryLine",
    "InventoryStatus",
    "KeyBase",
    "Military",
    "MilitaryPosture",
    "NuclearPosture",
    "NuclearStatus",
    "PublicOpinion",
    "RegimeType",
    "RelationStatus",
    "ServiceBranch",
    "Territory",
    "Theater",
    "Treaty",
]
