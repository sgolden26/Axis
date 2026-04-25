"""Eastern Europe / Suwalki-gap seed scenario.

Coarse hand-drawn polygons stand in for national borders; replace with
Natural Earth admin-0 once the data layer lands.

NATO is blue, Russia/Belarus is red, neutral is amber. Coordinates are
rough but plausible enough for the demo.
"""

from __future__ import annotations

from datetime import datetime, timezone

from axis.domain.faction import Allegiance
from axis.domain.theater import Theater
from axis.factories.scenario_builder import ScenarioBuilder
from axis.units.domain import UnitKind


def build() -> Theater:
    builder = (
        ScenarioBuilder("eastern_europe", "Suwalki Gap")
        .with_classification("UNCLASSIFIED // EXERCISE")
        .with_clock(datetime(2026, 4, 25, 11, 0, tzinfo=timezone.utc))
        .with_bbox(18.0, 52.0, 28.5, 56.5)
        .add_faction("nato", "NATO", Allegiance.BLUE, "#5aa9ff")
        .add_faction("ru", "Russian Federation", Allegiance.RED, "#ff5a5a")
        .add_faction("neutral", "Neutral", Allegiance.NEUTRAL, "#d6a45a")
    )

    _add_cities(builder)
    _add_territories(builder)
    _add_units(builder)
    return builder.build()


def _add_cities(b: ScenarioBuilder) -> None:
    b.add_city(
        "city.vilnius", "Vilnius", "nato",
        25.2797, 54.6872, 588_000, "capital",
        infrastructure=("rail_hub", "air_base"),
    )
    b.add_city(
        "city.kaunas", "Kaunas", "nato",
        23.9036, 54.8985, 295_000, "major",
        infrastructure=("air_base",),
    )
    b.add_city(
        "city.warsaw", "Warsaw", "nato",
        21.0122, 52.2297, 1_790_000, "capital",
        infrastructure=("rail_hub", "air_base", "command_node"),
    )
    b.add_city(
        "city.suwalki", "Suwalki", "nato",
        22.9305, 54.1115, 70_000, "minor",
        infrastructure=("rail_hub",),
    )
    b.add_city(
        "city.kaliningrad", "Kaliningrad", "ru",
        20.4522, 54.7104, 489_000, "major",
        infrastructure=("naval_base", "air_base", "command_node"),
    )
    b.add_city(
        "city.minsk", "Minsk", "ru",
        27.5615, 53.9045, 2_010_000, "capital",
        infrastructure=("rail_hub", "air_base", "command_node"),
    )
    b.add_city(
        "city.grodno", "Grodno", "ru",
        23.8345, 53.6884, 357_000, "minor",
        infrastructure=("rail_hub",),
    )


def _add_territories(b: ScenarioBuilder) -> None:
    # Heavily simplified outlines: enough to orient the viewer.
    b.add_territory(
        "terr.lithuania", "Lithuania", "nato",
        ring=[
            (21.05, 56.45), (22.85, 56.40), (24.85, 56.35),
            (26.55, 55.70), (26.80, 54.85), (25.50, 54.30),
            (24.10, 54.05), (22.85, 54.40), (21.05, 55.20),
            (21.05, 56.45),
        ],
        control=0.95,
    )
    b.add_territory(
        "terr.poland_ne", "Poland (NE)", "nato",
        ring=[
            (19.30, 54.45), (22.90, 54.40), (23.50, 54.05),
            (23.80, 52.10), (22.20, 52.00), (20.30, 52.50),
            (19.20, 53.30), (19.30, 54.45),
        ],
        control=0.97,
    )
    b.add_territory(
        "terr.kaliningrad", "Kaliningrad Oblast", "ru",
        ring=[
            (19.55, 54.95), (21.05, 55.20), (22.85, 54.90),
            (22.80, 54.40), (21.05, 54.35), (19.65, 54.45),
            (19.55, 54.95),
        ],
        control=1.0,
    )
    b.add_territory(
        "terr.belarus_w", "Belarus (West)", "ru",
        ring=[
            (23.50, 54.05), (26.80, 54.85), (28.30, 54.30),
            (27.90, 52.55), (24.20, 52.00), (23.50, 52.50),
            (23.50, 54.05),
        ],
        control=0.96,
    )


def _add_units(b: ScenarioBuilder) -> None:
    # NATO ground (Suwalki, Kaunas, Warsaw axes)
    b.add_unit(
        kind=UnitKind.ARMOURED_BRIGADE,
        id="unit.nato.armd-1", name="1st Armoured Bde", faction_id="nato",
        lon=22.95, lat=54.20, strength=0.92, readiness=0.78, morale=0.81,
        callsign="IRON-1",
    )
    b.add_unit(
        kind=UnitKind.INFANTRY_BRIGADE,
        id="unit.nato.inf-2", name="2nd Inf Bde (LT)", faction_id="nato",
        lon=23.95, lat=54.85, strength=0.88, readiness=0.74, morale=0.83,
        callsign="HUSAR-2",
    )
    b.add_unit(
        kind=UnitKind.INFANTRY_BRIGADE,
        id="unit.nato.inf-3", name="18th Mech Bde (PL)", faction_id="nato",
        lon=21.65, lat=53.45, strength=0.95, readiness=0.82, morale=0.85,
        callsign="HUSSAR-3",
    )
    b.add_unit(
        kind=UnitKind.AIR_WING,
        id="unit.nato.airw-1", name="32nd Tac Wing", faction_id="nato",
        lon=20.95, lat=52.40, strength=0.97, readiness=0.85, morale=0.86,
        callsign="VIPER",
    )
    b.add_unit(
        kind=UnitKind.NAVAL_TASK_GROUP,
        id="unit.nato.tg-1", name="BALTOPS TG-1", faction_id="nato",
        lon=19.55, lat=55.25, strength=0.90, readiness=0.80, morale=0.84,
        callsign="ANCHOR",
    )

    # Russia / Belarus
    b.add_unit(
        kind=UnitKind.ARMOURED_BRIGADE,
        id="unit.ru.armd-1", name="11th Gds Tank Bde", faction_id="ru",
        lon=20.65, lat=54.65, strength=0.94, readiness=0.81, morale=0.72,
        callsign="ZUBR",
    )
    b.add_unit(
        kind=UnitKind.INFANTRY_BRIGADE,
        id="unit.ru.inf-1", name="79th Motor Rifle Bde", faction_id="ru",
        lon=23.95, lat=53.70, strength=0.85, readiness=0.70, morale=0.65,
        callsign="VOLK",
    )
    b.add_unit(
        kind=UnitKind.INFANTRY_BRIGADE,
        id="unit.ru.inf-2", name="6th Sep Motor Rifle Bde", faction_id="ru",
        lon=27.30, lat=53.80, strength=0.82, readiness=0.68, morale=0.66,
        callsign="MEDVED",
    )
    b.add_unit(
        kind=UnitKind.AIR_WING,
        id="unit.ru.airw-1", name="689th GIAP", faction_id="ru",
        lon=20.45, lat=54.85, strength=0.88, readiness=0.72, morale=0.70,
        callsign="GRACH",
    )
    b.add_unit(
        kind=UnitKind.NAVAL_TASK_GROUP,
        id="unit.ru.tg-1", name="Baltic Fleet SAG", faction_id="ru",
        lon=19.85, lat=54.95, strength=0.86, readiness=0.74, morale=0.71,
        callsign="STORM",
    )
