"""Event domain: the atomic signal the morale pipeline consumes."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class EventCategory(str, Enum):
    """Event taxonomy used by the classifier and the action evaluator.

    Names are intentionally stable - they appear in `intel.json`,
    `state.actions[].category_sensitivities`, and the FE evaluator.
    """

    PROTEST = "protest"
    MILITARY_LOSS = "military_loss"
    ECONOMIC_STRESS = "economic_stress"
    POLITICAL_INSTABILITY = "political_instability"
    NATIONALIST_SENTIMENT = "nationalist_sentiment"


# Sign convention from the perspective of the controlling faction. Events
# can override (a successful recruitment drive can be MILITARY_LOSS=+0.3).
DEFAULT_CATEGORY_SIGN: dict[EventCategory, int] = {
    EventCategory.PROTEST: -1,
    EventCategory.MILITARY_LOSS: -1,
    EventCategory.ECONOMIC_STRESS: -1,
    EventCategory.POLITICAL_INSTABILITY: -1,
    EventCategory.NATIONALIST_SENTIMENT: +1,
}


@dataclass(frozen=True, slots=True)
class Event:
    """One classified signal tied to a region.

    `weight` is signed and bounded to [-1, 1]. It already encodes severity *and*
    direction (a `protest` with weight `-0.6` is a fairly bad protest for the
    controlling faction). The aggregator treats the sign verbatim.
    """

    id: str
    region_id: str
    ts: datetime
    category: EventCategory
    headline: str
    snippet: str
    weight: float
    source: str  # curated | gdelt | manual

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("Event.id must be non-empty")
        if not self.region_id:
            raise ValueError("Event.region_id must be non-empty")
        if not -1.0 <= self.weight <= 1.0:
            raise ValueError(f"Event.weight must be in [-1, 1], got {self.weight}")
        if self.ts.tzinfo is None:
            raise ValueError("Event.ts must be timezone-aware")

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "region_id": self.region_id,
            "ts": self.ts.isoformat(),
            "category": self.category.value,
            "headline": self.headline,
            "snippet": self.snippet,
            "weight": self.weight,
            "source": self.source,
        }
