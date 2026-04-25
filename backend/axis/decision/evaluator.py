"""Decision evaluator.

Pure function: `evaluate(action, region) -> Outcome`. The TS mirror in
`frontend/src/decision/evaluator.ts` MUST produce the same numbers; both
read the same Action blob (shipped via `state.json`) and the same
RegionIntel blob (shipped via `intel.json`).

Formula and constants are documented in `docs/decision-engine.md`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Literal

from axis.decision.actions import Action
from axis.intel.events import EventCategory
from axis.intel.morale import RegionIntel

SEVERITY_DIVISOR = 12.0
CONTRIBUTION_DIVISOR = 8.0
P_FLOOR = 0.05
P_CEIL = 0.95
SIGNIFICANT_DELTA = 0.015


BreakdownKind = Literal["base", "modifier", "category"]


@dataclass(frozen=True, slots=True)
class BreakdownItem:
    label: str
    kind: BreakdownKind
    delta: float  # contribution to probability, signed

    def to_dict(self) -> dict[str, object]:
        return {
            "label": self.label,
            "kind": self.kind,
            "delta": round(self.delta, 4),
        }


@dataclass(frozen=True, slots=True)
class Outcome:
    action_id: str
    region_id: str
    probability: float
    breakdown: tuple[BreakdownItem, ...]
    explanation: str

    def to_dict(self) -> dict[str, object]:
        return {
            "action_id": self.action_id,
            "region_id": self.region_id,
            "probability": round(self.probability, 4),
            "breakdown": [b.to_dict() for b in self.breakdown],
            "explanation": self.explanation,
        }


def _clamp(x: float, lo: float, hi: float) -> float:
    if x < lo:
        return lo
    if x > hi:
        return hi
    return x


def _trend_signed(label: str) -> float:
    if label == "rising":
        return 1.0
    if label == "declining":
        return -1.0
    return 0.0


def evaluate(action: Action, region: RegionIntel) -> Outcome:
    morale_norm = (region.morale_score - 50.0) / 50.0
    p_morale = morale_norm * action.morale_weight

    trend_signed = _trend_signed(region.morale_trend)
    p_trend = trend_signed * action.trend_weight

    severity_sum = sum(d.contribution for d in region.drivers)
    severity_norm = _clamp(severity_sum / SEVERITY_DIVISOR, -1.0, 1.0)
    p_severity = severity_norm * action.severity_weight

    category_items: list[BreakdownItem] = []
    for d in region.drivers:
        sensitivity = action.category_sensitivities.get(d.category, 0.0)
        if sensitivity == 0.0:
            continue
        # Intensity is loudness (always non-negative); the catalog's signed
        # sensitivity decides whether this category helps or hurts the action.
        intensity = _clamp(abs(d.contribution) / CONTRIBUTION_DIVISOR, 0.0, 1.0)
        delta = sensitivity * intensity
        if abs(delta) < SIGNIFICANT_DELTA:
            continue
        category_items.append(
            BreakdownItem(
                label=_category_label(d.category, d.contribution),
                kind="category",
                delta=delta,
            )
        )

    p_categories = sum(item.delta for item in category_items)

    raw = action.base_rate + p_morale + p_trend + p_severity + p_categories
    probability = _clamp(raw, P_FLOOR, P_CEIL)

    breakdown: list[BreakdownItem] = [
        BreakdownItem(label="base rate", kind="base", delta=action.base_rate),
        BreakdownItem(label=_morale_label(morale_norm), kind="modifier", delta=p_morale),
    ]
    if abs(p_trend) >= SIGNIFICANT_DELTA:
        breakdown.append(
            BreakdownItem(
                label=f"{region.morale_trend} trend",
                kind="modifier",
                delta=p_trend,
            )
        )
    if abs(p_severity) >= SIGNIFICANT_DELTA:
        breakdown.append(
            BreakdownItem(
                label="recent event severity",
                kind="modifier",
                delta=p_severity,
            )
        )
    breakdown.extend(category_items)

    explanation = _build_explanation(
        action=action,
        region=region,
        probability=probability,
        breakdown=breakdown,
    )

    return Outcome(
        action_id=action.id,
        region_id=region.region_id,
        probability=probability,
        breakdown=tuple(breakdown),
        explanation=explanation,
    )


def _morale_label(morale_norm: float) -> str:
    if morale_norm >= 0.4:
        return "high morale"
    if morale_norm <= -0.4:
        return "low morale"
    return "neutral morale"


_CATEGORY_PHRASE: dict[EventCategory, tuple[str, str]] = {
    EventCategory.PROTEST: ("protest activity", "protest activity"),
    EventCategory.MILITARY_LOSS: ("recent military setbacks", "improving military posture"),
    EventCategory.ECONOMIC_STRESS: ("economic stress", "easing economic stress"),
    EventCategory.POLITICAL_INSTABILITY: ("political instability", "political stabilisation"),
    EventCategory.NATIONALIST_SENTIMENT: ("subdued nationalist sentiment", "rising nationalist sentiment"),
}


def _category_label(category: EventCategory, contribution: float) -> str:
    negative_phrase, positive_phrase = _CATEGORY_PHRASE.get(
        category, (category.value, category.value)
    )
    return negative_phrase if contribution < 0 else positive_phrase


def _build_explanation(
    *,
    action: Action,
    region: RegionIntel,
    probability: float,
    breakdown: Iterable[BreakdownItem],
) -> str:
    modifiers = [b for b in breakdown if b.kind != "base"]
    modifiers.sort(key=lambda b: abs(b.delta), reverse=True)
    top = modifiers[:2]
    pct = round(probability * 100)
    base_pct = round(action.base_rate * 100)
    if not top:
        return f"{action.name} in {region.region_id}: {pct}% (baseline)."

    direction = "Reduced" if probability < action.base_rate else "Boosted"
    if abs(probability - action.base_rate) < 0.005:
        direction = "Held at"

    phrases = [_phrase_for(item) for item in top]
    joined = " and ".join(p for p in phrases if p)
    return (
        f"{direction} from {base_pct}% baseline to {pct}% by {joined}."
        if joined
        else f"{action.name}: {pct}%."
    )


def _phrase_for(item: BreakdownItem) -> str:
    if item.delta == 0:
        return ""
    sign = "−" if item.delta < 0 else "+"
    pct = round(abs(item.delta) * 100)
    return f"{item.label} ({sign}{pct}%)"
