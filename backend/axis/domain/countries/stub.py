"""Hand-authored country dossiers.

Plausible, internally consistent stub values. Numbers are illustrative and
deliberately not pinned to any specific public dataset; once a real loader
(CIA Factbook ingest, IISS Military Balance, etc.) lands behind
`CountryRepository`, this stub goes away or is kept for offline demos.
"""

from __future__ import annotations

from axis.domain.countries.repository import CountryRepository
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


COUNTRY_ACTIONS_DEMOCRATIC = (
    "raise_alert_level",
    "mobilise_reserves",
    "invoke_article_5",
    "open_air_corridor",
    "request_emergency_session",
    "issue_public_statement",
    "expel_diplomats",
    "sever_diplomatic_ties",
    "impose_sanctions",
    "authorise_lethal_aid",
)

COUNTRY_ACTIONS_AUTHORITARIAN = (
    "raise_alert_level",
    "mobilise_reserves",
    "declare_martial_law",
    "close_borders",
    "issue_public_statement",
    "expel_diplomats",
    "sever_diplomatic_ties",
    "host_allied_forces",
    "authorise_strategic_strike",
    "censor_independent_media",
)


def _lithuania() -> Country:
    return Country(
        id="lt",
        iso_a2="LT",
        iso_a3="LTU",
        name="Lithuania",
        official_name="Republic of Lithuania",
        faction_id="nato",
        flag_emoji="\U0001F1F1\U0001F1F9",  # LT
        capital_city_id="city.vilnius",
        government=Government(
            regime_type=RegimeType.LIBERAL_DEMOCRACY,
            head_of_state="President (stub)",
            head_of_government="Prime Minister (stub)",
            cabinet=(
                CabinetMember(title="Defence Minister", name="(stub)"),
                CabinetMember(title="Foreign Minister", name="(stub)"),
                CabinetMember(title="Interior Minister", name="(stub)"),
                CabinetMember(title="Finance Minister", name="(stub)"),
            ),
            approval_rating=0.46,
            stability_index=0.78,
            last_election="2024-10-13",
            next_election="2028-10",
        ),
        military=Military(
            active_personnel=23_000,
            reserve_personnel=104_000,
            paramilitary=14_500,
            branches=(
                ServiceBranch(
                    name="Lithuanian Land Force",
                    personnel=14_500,
                    inventory=(
                        InventoryLine("ifv", "Boxer (Vilkas)", 88),
                        InventoryLine("apc", "M113A1/A2", 195, InventoryStatus.LIMITED),
                        InventoryLine("spg", "PzH 2000", 18),
                        InventoryLine("atgm", "Javelin (FGM-148)", 220),
                        InventoryLine("manpads", "Stinger (FIM-92)", 60),
                    ),
                ),
                ServiceBranch(
                    name="Lithuanian Air Force",
                    personnel=1_300,
                    inventory=(
                        InventoryLine("trainer_attack", "L-39ZA Albatros", 4, InventoryStatus.LEGACY),
                        InventoryLine("transport", "C-27J Spartan", 3),
                        InventoryLine("helo_utility", "AS365 Dauphin", 3),
                        InventoryLine("sam", "NASAMS", 2),
                    ),
                ),
                ServiceBranch(
                    name="Lithuanian Naval Force",
                    personnel=600,
                    inventory=(
                        InventoryLine("opv", "Flyvefisken-class", 3),
                        InventoryLine("mcm", "Hunt-class minehunter", 2),
                    ),
                ),
                ServiceBranch(
                    name="National Defence Volunteer Force (KASP)",
                    personnel=6_600,
                    inventory=(),
                ),
            ),
            doctrine="Total defence; deny rapid fait accompli; integrate with NATO eFP.",
            posture=MilitaryPosture.DEFENSIVE,
            alert_level=4,
            c2_nodes=("Vilnius MOD", "Kaunas JFHQ", "Suwalki Liaison Cell"),
        ),
        nuclear=NuclearPosture(
            status=NuclearStatus.UMBRELLA_HOST,
            warheads=0,
            delivery_systems=(),
            declared_posture=(
                "Non-nuclear; relies on NATO extended deterrence under the Strategic Concept."
            ),
            nfu=None,
        ),
        demographics=Demographics(
            population=2_790_000,
            median_age=44.8,
            urbanisation=0.68,
            ethnic_groups=(
                Composition("Lithuanian", 0.84),
                Composition("Polish", 0.06),
                Composition("Russian", 0.05),
                Composition("Belarusian", 0.01),
                Composition("Other", 0.04),
            ),
            languages=(
                Composition("Lithuanian", 0.85),
                Composition("Russian", 0.08),
                Composition("Polish", 0.06),
                Composition("Other", 0.01),
            ),
            religions=(
                Composition("Roman Catholic", 0.74),
                Composition("Orthodox", 0.04),
                Composition("None / unspecified", 0.20),
                Composition("Other", 0.02),
            ),
        ),
        diplomacy=Diplomacy(
            alliance_memberships=("NATO", "EU", "UN", "OSCE", "OECD"),
            treaties=(
                Treaty("North Atlantic Treaty", "collective_defence", ("NATO members",), True),
                Treaty("EU Treaties", "political_economic", ("EU members",), True),
                Treaty("US-Lithuania DCA", "basing", ("us", "lt"), True),
            ),
            relations=(
                BilateralRelation("by", RelationStatus.HOSTILE, -0.7),
                BilateralRelation("ru", RelationStatus.HOSTILE, -0.85),
                BilateralRelation("pl", RelationStatus.ALLIED, 0.85),
                BilateralRelation("lv", RelationStatus.ALLIED, 0.9),
                BilateralRelation("ee", RelationStatus.ALLIED, 0.9),
                BilateralRelation("us", RelationStatus.ALLIED, 0.85),
                BilateralRelation("de", RelationStatus.ALLIED, 0.75),
                BilateralRelation("ua", RelationStatus.FRIENDLY, 0.7),
            ),
        ),
        energy=EnergyLogistics(
            oil_dependence=0.95,
            gas_dependence=1.0,
            top_gas_supplier="USA / Norway (LNG via Klaipeda)",
            pipelines=("Klaipeda LNG terminal", "GIPL (LT-PL gas interconnector)"),
            key_ports=("Klaipeda",),
            rail_gauge_mm=1520,
            strategic_reserves_days=90,
        ),
        public_opinion=PublicOpinion(
            war_support=0.62,
            institutional_trust=0.55,
            censorship_index=0.10,
            protest_intensity=0.18,
            top_outlets=("LRT", "Delfi", "15min", "BNS"),
        ),
        geography=Geography(
            area_km2=65_300,
            land_borders=(
                Border("lv", 588),
                Border("by", 678),
                Border("pl", 104),
                Border("ru", 273),  # Kaliningrad
            ),
            key_bases=(
                KeyBase("Siauliai Air Base (NATO BAP)", "air_base", 23.3950, 55.8945, "lt"),
                KeyBase("Rukla Training Area (eFP)", "training_ground", 24.2900, 55.0167, "lt"),
                KeyBase("Klaipeda Naval Base", "naval_base", 21.1167, 55.7000, "lt"),
                KeyBase("Kazlu Ruda Range", "training_ground", 23.5000, 54.7500, "lt"),
            ),
        ),
        available_actions=COUNTRY_ACTIONS_DEMOCRATIC,
    )


def _belarus() -> Country:
    return Country(
        id="by",
        iso_a2="BY",
        iso_a3="BLR",
        name="Belarus",
        official_name="Republic of Belarus",
        faction_id="ru",
        flag_emoji="\U0001F1E7\U0001F1FE",  # BY
        capital_city_id="city.minsk",
        government=Government(
            regime_type=RegimeType.AUTHORITARIAN,
            head_of_state="President (stub)",
            head_of_government="Prime Minister (stub)",
            cabinet=(
                CabinetMember(title="Defence Minister", name="(stub)"),
                CabinetMember(title="Foreign Minister", name="(stub)"),
                CabinetMember(title="State Security (KGB)", name="(stub)"),
                CabinetMember(title="Interior Minister", name="(stub)"),
            ),
            approval_rating=0.35,
            stability_index=0.42,
            last_election="2025-01-26",
            next_election="2030-01",
        ),
        military=Military(
            active_personnel=48_000,
            reserve_personnel=290_000,
            paramilitary=110_000,
            branches=(
                ServiceBranch(
                    name="Belarusian Ground Forces",
                    personnel=29_000,
                    inventory=(
                        InventoryLine("mbt", "T-72B / T-72B3 (RU)", 580),
                        InventoryLine("ifv", "BMP-2", 1_165, InventoryStatus.LIMITED),
                        InventoryLine("apc", "BTR-80 / BTR-82A", 188),
                        InventoryLine("spg", "2S19 Msta-S", 130),
                        InventoryLine("mlrs", "BM-21 / Polonez", 192),
                        InventoryLine("ssm", "Iskander-M (host RU)", 12),
                    ),
                ),
                ServiceBranch(
                    name="Air Force & Air Defence",
                    personnel=11_500,
                    inventory=(
                        InventoryLine("fighter", "Su-30SM (RU-supplied)", 12),
                        InventoryLine("fighter", "MiG-29", 32, InventoryStatus.LIMITED),
                        InventoryLine("attack", "Su-25", 56, InventoryStatus.LEGACY),
                        InventoryLine("helo_attack", "Mi-24", 12, InventoryStatus.LEGACY),
                        InventoryLine("sam_long", "S-400 (RU-detached)", 4),
                        InventoryLine("sam_med", "S-300PS", 16, InventoryStatus.LIMITED),
                    ),
                ),
                ServiceBranch(
                    name="Special Operations Forces",
                    personnel=6_000,
                    inventory=(
                        InventoryLine("sf_brigade", "Brigades", 4),
                    ),
                ),
                ServiceBranch(
                    name="Internal Troops (MVD)",
                    personnel=11_000,
                    inventory=(),
                ),
            ),
            doctrine="Union State integration with Russia; forward host for Russian strategic assets.",
            posture=MilitaryPosture.DETERRENT,
            alert_level=3,
            c2_nodes=("Minsk MOD", "Asipovichy Storage Site", "Baranavichy Air Base C2"),
        ),
        nuclear=NuclearPosture(
            status=NuclearStatus.UMBRELLA_HOST,
            warheads=0,  # Russian non-strategic warheads forward-deployed; not Belarusian-controlled
            delivery_systems=("Iskander-M (RU)", "Su-25 nuclear-capable retrofit"),
            declared_posture=(
                "Hosts Russian non-strategic nuclear weapons under Union State arrangements."
            ),
            nfu=None,
        ),
        demographics=Demographics(
            population=9_150_000,
            median_age=41.5,
            urbanisation=0.80,
            ethnic_groups=(
                Composition("Belarusian", 0.84),
                Composition("Russian", 0.08),
                Composition("Polish", 0.03),
                Composition("Ukrainian", 0.02),
                Composition("Other", 0.03),
            ),
            languages=(
                Composition("Russian", 0.71),
                Composition("Belarusian", 0.26),
                Composition("Other", 0.03),
            ),
            religions=(
                Composition("Orthodox", 0.48),
                Composition("Roman Catholic", 0.07),
                Composition("None / unspecified", 0.41),
                Composition("Other", 0.04),
            ),
        ),
        diplomacy=Diplomacy(
            alliance_memberships=("CSTO", "Union State", "CIS", "EAEU", "SCO observer"),
            treaties=(
                Treaty("Union State Treaty", "political_military", ("ru", "by"), True),
                Treaty("CSTO Charter", "collective_defence", ("CSTO members",), True),
                Treaty("EU Sanctions Regime", "sanctions_target", ("EU",), True),
            ),
            relations=(
                BilateralRelation("ru", RelationStatus.ALLIED, 0.95),
                BilateralRelation("lt", RelationStatus.HOSTILE, -0.7),
                BilateralRelation("pl", RelationStatus.HOSTILE, -0.75),
                BilateralRelation("lv", RelationStatus.HOSTILE, -0.6),
                BilateralRelation("ua", RelationStatus.HOSTILE, -0.85),
                BilateralRelation("us", RelationStatus.HOSTILE, -0.85),
                BilateralRelation("de", RelationStatus.STRAINED, -0.5),
            ),
        ),
        energy=EnergyLogistics(
            oil_dependence=0.85,
            gas_dependence=1.0,
            top_gas_supplier="Russia (Gazprom)",
            pipelines=(
                "Druzhba (oil)",
                "Yamal-Europe (gas)",
                "Northern Lights (gas)",
            ),
            key_ports=(),  # landlocked
            rail_gauge_mm=1520,
            strategic_reserves_days=60,
        ),
        public_opinion=PublicOpinion(
            war_support=0.28,
            institutional_trust=0.30,
            censorship_index=0.82,
            protest_intensity=0.45,
            top_outlets=("Belta (state)", "ONT (state)", "Nasha Niva (exile)", "Zerkalo (exile)"),
        ),
        geography=Geography(
            area_km2=207_600,
            land_borders=(
                Border("ru", 1_312),
                Border("ua", 1_111),
                Border("pl", 418),
                Border("lt", 678),
                Border("lv", 173),
            ),
            key_bases=(
                KeyBase("Baranavichy Air Base", "air_base", 26.0500, 53.1000, "by"),
                KeyBase("Lida Air Base", "air_base", 25.3733, 53.8867, "by"),
                KeyBase("Asipovichy 1405 Storage", "command_node", 28.6400, 53.3000, "by"),
                KeyBase("Brest Garrison", "training_ground", 23.7000, 52.0833, "by"),
                KeyBase("Hantsavichy EW Radar (RU)", "command_node", 26.5333, 52.8500, "by"),
            ),
        ),
        available_actions=COUNTRY_ACTIONS_AUTHORITARIAN,
    )


class StubCountryRepository(CountryRepository):
    """Hand-authored country dossiers. Replace with a live adapter later."""

    def __init__(self) -> None:
        self._countries: dict[str, Country] = {
            "lt": _lithuania(),
            "by": _belarus(),
        }

    def get(self, country_id: str) -> Country:
        try:
            return self._countries[country_id]
        except KeyError as exc:
            raise KeyError(f"StubCountryRepository: unknown country {country_id!r}") from exc

    def list_ids(self) -> tuple[str, ...]:
        return tuple(self._countries.keys())
