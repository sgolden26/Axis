"""SnapshotExporter: walk a Theater into the JSON shape defined in docs/schema.md."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from axis import SCHEMA_VERSION
from axis.decision.actions import DEFAULT_ACTIONS, Action, action_catalog_to_dict
from axis.domain.city import City
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
    KeyBase,
    Military,
    NuclearPosture,
    PublicOpinion,
    ServiceBranch,
    Treaty,
)
from axis.domain.faction import Faction
from axis.domain.territory import Territory
from axis.domain.theater import Theater
from axis.units.base import Unit


class SnapshotExporter:
    """Convert a `Theater` into a JSON-serialisable dict matching the schema."""

    def __init__(
        self,
        theater: Theater,
        *,
        actions: tuple[Action, ...] = DEFAULT_ACTIONS,
    ) -> None:
        self._theater = theater
        self._actions = actions

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
            "countries": [self._country(c) for c in t.countries],
            "cities": [self._city(c) for c in t.cities],
            "territories": [self._territory(p) for p in t.territories],
            "units": [self._unit(u) for u in t.units],
            "actions": action_catalog_to_dict(self._actions),
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
        out: dict[str, Any] = {
            "id": c.id,
            "name": c.name,
            "faction_id": c.faction_id,
            "position": [c.position.lon, c.position.lat],
            "population": c.population,
            "importance": c.importance.value,
            "infrastructure": list(c.infrastructure),
        }
        if c.country_id is not None:
            out["country_id"] = c.country_id
        return out

    @staticmethod
    def _territory(t: Territory) -> dict[str, Any]:
        out: dict[str, Any] = {
            "id": t.id,
            "name": t.name,
            "faction_id": t.faction_id,
            "polygon": [[[pt.lon, pt.lat] for pt in ring] for ring in t.polygon],
            "control": t.control,
        }
        if t.country_id is not None:
            out["country_id"] = t.country_id
        return out

    @staticmethod
    def _unit(u: Unit) -> dict[str, Any]:
        out: dict[str, Any] = {
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
            "available_actions": list(u.available_actions),
        }
        if u.country_id is not None:
            out["country_id"] = u.country_id
        return out

    @classmethod
    def _country(cls, c: Country) -> dict[str, Any]:
        return {
            "id": c.id,
            "iso_a2": c.iso_a2,
            "iso_a3": c.iso_a3,
            "name": c.name,
            "official_name": c.official_name,
            "faction_id": c.faction_id,
            "flag_emoji": c.flag_emoji,
            "capital_city_id": c.capital_city_id,
            "government": cls._government(c.government),
            "military": cls._military(c.military),
            "nuclear": cls._nuclear(c.nuclear),
            "demographics": cls._demographics(c.demographics),
            "diplomacy": cls._diplomacy(c.diplomacy),
            "energy": cls._energy(c.energy),
            "public_opinion": cls._public_opinion(c.public_opinion),
            "geography": cls._geography(c.geography),
            "available_actions": list(c.available_actions),
        }

    @staticmethod
    def _cabinet_member(m: CabinetMember) -> dict[str, Any]:
        return {"title": m.title, "name": m.name}

    @classmethod
    def _government(cls, g: Government) -> dict[str, Any]:
        return {
            "regime_type": g.regime_type.value,
            "head_of_state": g.head_of_state,
            "head_of_government": g.head_of_government,
            "cabinet": [cls._cabinet_member(m) for m in g.cabinet],
            "approval_rating": g.approval_rating,
            "stability_index": g.stability_index,
            "last_election": g.last_election,
            "next_election": g.next_election,
        }

    @staticmethod
    def _inventory_line(line: InventoryLine) -> dict[str, Any]:
        return {
            "category": line.category,
            "label": line.label,
            "count": line.count,
            "status": line.status.value,
        }

    @classmethod
    def _branch(cls, b: ServiceBranch) -> dict[str, Any]:
        return {
            "name": b.name,
            "personnel": b.personnel,
            "inventory": [cls._inventory_line(i) for i in b.inventory],
        }

    @classmethod
    def _military(cls, m: Military) -> dict[str, Any]:
        return {
            "active_personnel": m.active_personnel,
            "reserve_personnel": m.reserve_personnel,
            "paramilitary": m.paramilitary,
            "branches": [cls._branch(b) for b in m.branches],
            "doctrine": m.doctrine,
            "posture": m.posture.value,
            "alert_level": m.alert_level,
            "c2_nodes": list(m.c2_nodes),
        }

    @staticmethod
    def _nuclear(n: NuclearPosture) -> dict[str, Any]:
        return {
            "status": n.status.value,
            "warheads": n.warheads,
            "delivery_systems": list(n.delivery_systems),
            "declared_posture": n.declared_posture,
            "nfu": n.nfu,
        }

    @staticmethod
    def _composition(c: Composition) -> dict[str, Any]:
        return {"label": c.label, "share": c.share}

    @classmethod
    def _demographics(cls, d: Demographics) -> dict[str, Any]:
        return {
            "population": d.population,
            "median_age": d.median_age,
            "urbanisation": d.urbanisation,
            "ethnic_groups": [cls._composition(c) for c in d.ethnic_groups],
            "languages": [cls._composition(c) for c in d.languages],
            "religions": [cls._composition(c) for c in d.religions],
        }

    @staticmethod
    def _treaty(t: Treaty) -> dict[str, Any]:
        return {
            "name": t.name,
            "kind": t.kind,
            "parties": list(t.parties),
            "in_force": t.in_force,
        }

    @staticmethod
    def _relation(r: BilateralRelation) -> dict[str, Any]:
        return {
            "other_country_id": r.other_country_id,
            "status": r.status.value,
            "score": r.score,
        }

    @classmethod
    def _diplomacy(cls, d: Diplomacy) -> dict[str, Any]:
        return {
            "alliance_memberships": list(d.alliance_memberships),
            "treaties": [cls._treaty(t) for t in d.treaties],
            "relations": [cls._relation(r) for r in d.relations],
        }

    @staticmethod
    def _energy(e: EnergyLogistics) -> dict[str, Any]:
        return {
            "oil_dependence": e.oil_dependence,
            "gas_dependence": e.gas_dependence,
            "top_gas_supplier": e.top_gas_supplier,
            "pipelines": list(e.pipelines),
            "key_ports": list(e.key_ports),
            "rail_gauge_mm": e.rail_gauge_mm,
            "strategic_reserves_days": e.strategic_reserves_days,
        }

    @staticmethod
    def _public_opinion(p: PublicOpinion) -> dict[str, Any]:
        return {
            "war_support": p.war_support,
            "institutional_trust": p.institutional_trust,
            "censorship_index": p.censorship_index,
            "protest_intensity": p.protest_intensity,
            "top_outlets": list(p.top_outlets),
        }

    @staticmethod
    def _border(b: Border) -> dict[str, Any]:
        return {"other": b.other, "length_km": b.length_km}

    @staticmethod
    def _key_base(k: KeyBase) -> dict[str, Any]:
        return {
            "name": k.name,
            "kind": k.kind,
            "lon": k.lon,
            "lat": k.lat,
            "owner_country_id": k.owner_country_id,
        }

    @classmethod
    def _geography(cls, g: Geography) -> dict[str, Any]:
        return {
            "area_km2": g.area_km2,
            "land_borders": [cls._border(b) for b in g.land_borders],
            "key_bases": [cls._key_base(k) for k in g.key_bases],
        }
