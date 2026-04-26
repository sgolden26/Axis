"""Order abstraction and resolver.

The simulation engine accepts batches of player-issued `Order` instances and
mutates a `Theater` accordingly. The hierarchy is intentionally polymorphic so
new order kinds (`StrikeOrder`, `LogisticsOrder`, ...) can drop in alongside
`MoveOrder` without changes to the HTTP layer or the FE wiring.

Design points:

- `Order` is the ABC. Each subclass owns a unique `kind` discriminator, knows
  how to validate itself against a `Theater`, and how to apply itself.
- `OrderRegistry` decodes `{"kind": ..., ...}` payloads into the right
  subclass. New kinds register themselves at import time via
  `OrderRegistry.register`.
- `OrderBatch` runs validate-all then apply-all so a malformed order doesn't
  half-mutate the theatre.
"""

from __future__ import annotations

import math
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar, Literal

from axis.domain.coordinates import Coordinate
from axis.domain.faction import Allegiance
from axis.domain.theater import Theater
from axis.units.base import Unit
from axis.units.domain import UnitDomain


PlayerTeam = Literal["red", "blue"]


_TEAM_TO_ALLEGIANCE: dict[PlayerTeam, Allegiance] = {
    "red": Allegiance.RED,
    "blue": Allegiance.BLUE,
}


# Mirror of frontend/src/state/groundMove.ts RADIUS_KM. Keep in sync.
_GROUND_MOVE_RADIUS_KM: dict[str, float] = {
    "foot": 24.1,
    "vehicle": 250.0,
}


def _haversine_km(a: Coordinate, b: Coordinate) -> float:
    """Great-circle distance between two coordinates in kilometres."""
    r_km = 6371.0088
    lat1 = math.radians(a.lat)
    lat2 = math.radians(b.lat)
    dlat = lat2 - lat1
    dlon = math.radians(b.lon - a.lon)
    h = math.sin(dlat / 2.0) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
    return 2.0 * r_km * math.asin(min(1.0, math.sqrt(h)))


# ---------------------------------------------------------------------------
# Validation outcome
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class OrderOutcome:
    """Per-order result returned to the caller."""

    order_id: str
    ok: bool
    message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {"order_id": self.order_id, "ok": self.ok, "message": self.message}


# ---------------------------------------------------------------------------
# Order ABC + registry
# ---------------------------------------------------------------------------


class Order(ABC):
    """A single player-issued instruction the engine can resolve."""

    kind: ClassVar[str]

    def __init__(self, *, order_id: str, issuer_team: PlayerTeam) -> None:
        if not order_id:
            raise ValueError("Order.order_id must be non-empty")
        if issuer_team not in ("red", "blue"):
            raise ValueError(f"issuer_team must be 'red' or 'blue', got {issuer_team!r}")
        self.order_id = order_id
        self.issuer_team = issuer_team

    @abstractmethod
    def validate(self, theater: Theater) -> OrderOutcome:
        """Check the order is legal against the given theatre."""

    @abstractmethod
    def apply(self, theater: Theater) -> None:
        """Mutate the theatre to reflect this order. Caller has validated."""

    @classmethod
    @abstractmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Order":
        """Decode `raw` into a concrete Order instance."""


class OrderRegistry:
    """Decodes JSON payloads into concrete Order subclasses."""

    _classes: ClassVar[dict[str, type[Order]]] = {}

    @classmethod
    def register(cls, order_cls: type[Order]) -> type[Order]:
        kind = getattr(order_cls, "kind", None)
        if not isinstance(kind, str) or not kind:
            raise TypeError(f"{order_cls!r} must define a non-empty `kind` ClassVar")
        if kind in cls._classes and cls._classes[kind] is not order_cls:
            raise ValueError(f"Order kind {kind!r} already registered")
        cls._classes[kind] = order_cls
        return order_cls

    @classmethod
    def decode(cls, raw: dict[str, Any]) -> Order:
        kind = raw.get("kind")
        if not isinstance(kind, str):
            raise ValueError("order payload missing 'kind'")
        if kind not in cls._classes:
            raise ValueError(f"unknown order kind: {kind!r}")
        return cls._classes[kind].from_dict(raw)

    @classmethod
    def known_kinds(cls) -> tuple[str, ...]:
        return tuple(sorted(cls._classes))


# ---------------------------------------------------------------------------
# MoveOrder: ground unit relocation, mode-gated radius
# ---------------------------------------------------------------------------


GroundMoveMode = Literal["foot", "vehicle"]


class MoveOrder(Order):
    """Relocate a single ground unit to a destination within mode radius."""

    kind: ClassVar[str] = "move"

    def __init__(
        self,
        *,
        order_id: str,
        issuer_team: PlayerTeam,
        unit_id: str,
        mode: GroundMoveMode,
        destination: Coordinate,
    ) -> None:
        super().__init__(order_id=order_id, issuer_team=issuer_team)
        if mode not in ("foot", "vehicle"):
            raise ValueError(f"MoveOrder.mode must be 'foot' or 'vehicle', got {mode!r}")
        self.unit_id = unit_id
        self.mode = mode
        self.destination = destination

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "MoveOrder":
        try:
            dest = raw["destination"]
            lon = float(dest[0])
            lat = float(dest[1])
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise ValueError(f"MoveOrder destination malformed: {exc}") from exc
        return cls(
            order_id=str(raw["order_id"]),
            issuer_team=raw["issuer_team"],
            unit_id=str(raw["unit_id"]),
            mode=raw["mode"],
            destination=Coordinate(lon=lon, lat=lat),
        )

    def _find_unit(self, theater: Theater) -> Unit | None:
        for u in theater.units:
            if u.id == self.unit_id:
                return u
        return None

    def validate(self, theater: Theater) -> OrderOutcome:
        unit = self._find_unit(theater)
        if unit is None:
            return OrderOutcome(self.order_id, False, f"unknown unit: {self.unit_id}")
        if unit.domain is not UnitDomain.GROUND:
            return OrderOutcome(
                self.order_id,
                False,
                f"unit {unit.id} is not a ground unit (domain={unit.domain.value})",
            )
        try:
            faction = theater.faction(unit.faction_id)
        except KeyError:
            return OrderOutcome(
                self.order_id, False, f"unit {unit.id} references unknown faction"
            )
        if faction.allegiance is not _TEAM_TO_ALLEGIANCE[self.issuer_team]:
            return OrderOutcome(
                self.order_id,
                False,
                f"unit {unit.id} does not belong to the {self.issuer_team} team",
            )
        radius_km = _GROUND_MOVE_RADIUS_KM[self.mode]
        distance_km = _haversine_km(unit.position, self.destination)
        # Tolerate ~1% slack to match FE clamping rounding.
        if distance_km > radius_km * 1.01:
            return OrderOutcome(
                self.order_id,
                False,
                f"destination {distance_km:.1f} km exceeds {self.mode} range {radius_km:.1f} km",
            )
        return OrderOutcome(self.order_id, True, "ok")

    def apply(self, theater: Theater) -> None:
        unit = self._find_unit(theater)
        if unit is None:  # pragma: no cover - validate() should have caught this
            raise RuntimeError(f"MoveOrder.apply: unit {self.unit_id} no longer present")
        unit.position = self.destination


OrderRegistry.register(MoveOrder)


# ---------------------------------------------------------------------------
# Batch
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class ExecutionResult:
    """Aggregate outcome of an OrderBatch.apply call."""

    ok: bool
    outcomes: list[OrderOutcome] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"ok": self.ok, "outcomes": [o.to_dict() for o in self.outcomes]}


@dataclass(slots=True)
class OrderBatch:
    """A list of orders submitted together for a single team."""

    issuer_team: PlayerTeam
    orders: list[Order]

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "OrderBatch":
        team = raw.get("issuer_team")
        if team not in ("red", "blue"):
            raise ValueError(f"issuer_team must be 'red' or 'blue', got {team!r}")
        raw_orders = raw.get("orders", [])
        if not isinstance(raw_orders, list):
            raise ValueError("OrderBatch.orders must be a list")
        orders: list[Order] = []
        for o in raw_orders:
            if not isinstance(o, dict):
                raise ValueError("each order must be an object")
            payload = dict(o)
            payload.setdefault("issuer_team", team)
            if payload["issuer_team"] != team:
                raise ValueError(
                    f"order {payload.get('order_id')!r} issuer_team "
                    f"{payload['issuer_team']!r} differs from batch {team!r}"
                )
            orders.append(OrderRegistry.decode(payload))
        return cls(issuer_team=team, orders=orders)

    def execute(self, theater: Theater) -> ExecutionResult:
        """Validate all, then apply if every order is valid.

        Returns the per-order outcomes. If any order fails validation, no
        order is applied (`ok=False`); the caller can re-stage / amend.
        """
        outcomes = [order.validate(theater) for order in self.orders]
        if not all(o.ok for o in outcomes):
            return ExecutionResult(ok=False, outcomes=outcomes)
        for order in self.orders:
            order.apply(theater)
        return ExecutionResult(ok=True, outcomes=outcomes)
