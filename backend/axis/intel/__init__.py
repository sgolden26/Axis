"""Intel / political layer.

Pluggable pipeline that turns event signals (curated, frozen GDELT, or live
GDELT) into per-region morale snapshots. The output shape is documented in
`docs/intel.md` and consumed verbatim by the frontend Decision Engine.

Strictly separated from `axis.sim` so the simulation can run with or without
live intel signals (deterministic replay vs. live mode).
"""

from axis.intel.events import (
    Event,
    EventCategory,
    DEFAULT_CATEGORY_SIGN,
)
from axis.intel.morale import (
    Driver,
    RegionIntel,
    IntelSnapshot,
    aggregate_region,
    aggregate_all,
)
from axis.intel.pipeline import IntelPipeline, build_source

__all__ = [
    "Event",
    "EventCategory",
    "DEFAULT_CATEGORY_SIGN",
    "Driver",
    "RegionIntel",
    "IntelSnapshot",
    "aggregate_region",
    "aggregate_all",
    "IntelPipeline",
    "build_source",
]
