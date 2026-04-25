"""GdeltLiveSource: real-time GDELT 2.0 client (stub).

Interface-complete so the rest of the pipeline can be written and tested
without the network. To switch to live mode later, implement `fetch()` to:

1. Query the GDELT 2.0 GKG API (https://api.gdeltproject.org/api/v2/doc/doc)
   filtered by the bbox of each region.
2. Map the raw `V2Themes` / `V2Tone` columns onto our `EventCategory` taxonomy
   (a small keyword/regex classifier is enough for v0).
3. Build `Event` instances with `source="gdelt"`.

For v0.2 this raises NotImplementedError if the user actually selects it,
but importing the class is safe.
"""

from __future__ import annotations

from datetime import datetime

from axis.intel.events import Event
from axis.intel.sources.base import IntelSource


class GdeltLiveSource(IntelSource):
    name = "gdelt_live"

    def __init__(self, *, lookback_hours: int = 48) -> None:
        self._lookback_hours = lookback_hours

    def fetch(self, now: datetime) -> list[Event]:  # noqa: ARG002
        raise NotImplementedError(
            "GdeltLiveSource is stubbed. Use --source curated or "
            "--source gdelt_snapshot for the v0.2 demo. Implement this "
            "module to flip on live ingestion."
        )
