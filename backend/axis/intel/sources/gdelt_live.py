"""GdeltLiveSource: real-time GDELT 2.0 DOC API client.

Hits the public DOC 2.0 API (no key required) once per region, classifies
each returned article into our `EventCategory` taxonomy from its title,
and converts the result into a signed weight in [-1, 1].

API reference: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/

Design notes:

- Pure stdlib (`urllib.request`) so we don't pull in `requests`.
- Per-region queries with country/keyword filters; English-language only
  to keep the classifier simple.
- The classifier is a small regex word list. Articles whose titles don't
  hit any pattern are dropped (the API returns a lot of off-topic noise).
- Weight: GDELT's `ArtList` JSON mode does not expose per-article tone, so
  we map category -> signed magnitude using `DEFAULT_CATEGORY_SIGN` and
  bump magnitude when titles contain high-severity keywords. If a future
  API revision starts returning `tone`, we use it directly.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from axis.intel.events import DEFAULT_CATEGORY_SIGN, Event, EventCategory
from axis.intel.sources.base import IntelSource

log = logging.getLogger(__name__)

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"
USER_AGENT = "axis-wargame/0.2 (+https://github.com/sgolden26/Axis)"


@dataclass(frozen=True, slots=True)
class _RegionQuery:
    """How to ask GDELT for news about one of our scenario regions."""

    region_id: str
    query: str  # GDELT DOC query string


# Hand-tuned per-region queries. Keep these tight - the DOC API will OR
# everything inside the parens and AND with the language filter. Adding too
# many keywords flips the API into "everything" mode.
DEFAULT_REGION_QUERIES: tuple[_RegionQuery, ...] = (
    _RegionQuery(
        region_id="obl.30",
        query='(Kyiv OR Kiev OR "Ukraine government" OR Bankova)',
    ),
    _RegionQuery(
        region_id="obl.63",
        query='(Kharkiv OR Kharkov OR Vovchansk OR Kupiansk)',
    ),
    _RegionQuery(
        region_id="obl.14",
        query='(Donetsk OR Bakhmut OR Avdiivka OR Pokrovsk OR Mariupol)',
    ),
    _RegionQuery(
        region_id="obl.09",
        query='(Luhansk OR Lugansk OR Severodonetsk OR Lyman OR Kreminna)',
    ),
    _RegionQuery(
        region_id="obl.23",
        query='(Zaporizhzhia OR Zaporozhye OR Tokmak OR Melitopol OR Robotyne)',
    ),
    _RegionQuery(
        region_id="obl.65",
        query='(Kherson OR "Dnipro estuary" OR Kakhovka OR "left bank")',
    ),
    _RegionQuery(
        region_id="obl.51",
        query='(Odesa OR Odessa OR "Black Sea grain" OR Izmail)',
    ),
    _RegionQuery(
        region_id="obl.43",
        query='(Crimea OR Simferopol OR Sevastopol OR "Kerch bridge" OR Dzhankoi)',
    ),
    _RegionQuery(
        region_id="obl.59",
        query='(Sumy OR "Sumy oblast" OR "Russian border")',
    ),
    _RegionQuery(
        region_id="obl.74",
        query='(Chernihiv OR "Chernihiv oblast")',
    ),
    _RegionQuery(
        region_id="terr.donbas-occ",
        query='(Donbas OR "occupied Donetsk" OR "occupied Luhansk")',
    ),
    _RegionQuery(
        region_id="terr.crimea-occ",
        query='(Crimea OR "occupied Crimea" OR Sevastopol)',
    ),
    _RegionQuery(
        region_id="terr.south-occ",
        query='("southern Ukraine" OR Melitopol OR Berdiansk OR "land bridge")',
    ),
    _RegionQuery(
        region_id="terr.ukraine-free",
        query='(Ukraine OR Kyiv OR Lviv OR Dnipro)',
    ),
)


# Word-list classifier. Order matters: we walk categories top to bottom and
# take the first hit. military_loss is checked before protest because "attack
# on protest" should still register as kinetic.
_CATEGORY_PATTERNS: tuple[tuple[EventCategory, re.Pattern[str]], ...] = (
    (
        EventCategory.MILITARY_LOSS,
        re.compile(
            r"\b("
            r"killed|casualt(?:y|ies)|wounded|destroyed|missile|drone|strike|"
            r"airstrike|shelling|shelled|explos\w+|sabotage|downed|shot down|"
            r"attack|attacked|combat|incursion|fire(?:fight)?|skirmish|"
            r"deserter|desertion|mobiliz\w+|conscript\w+"
            r")\b",
            re.IGNORECASE,
        ),
    ),
    (
        EventCategory.PROTEST,
        re.compile(
            r"\b("
            r"protest\w*|demonstrat\w+|rally|rallies|march(?:es|ed|ing)?|"
            r"strike(?:s|rs)?|riot\w*|sit-?in|walkout|blockade|picket"
            r")\b",
            re.IGNORECASE,
        ),
    ),
    (
        EventCategory.ECONOMIC_STRESS,
        re.compile(
            r"\b("
            r"inflation|sanction\w*|recession|crisis|crash|"
            r"price\s+(?:rise|hike|surge|jump)|"
            r"currency|ruble|rouble|zloty|euro|"
            r"unemploy\w+|layoff\w*|shortage|fuel|energy"
            r")\b",
            re.IGNORECASE,
        ),
    ),
    (
        EventCategory.POLITICAL_INSTABILITY,
        re.compile(
            r"\b("
            r"resign\w*|coup|no[- ]confidence|scandal|corrupt\w+|"
            r"reshuffle|ous(?:t|ted|ter)|impeach\w+|disput\w+|"
            r"crackdown|detained|arrest\w*"
            r")\b",
            re.IGNORECASE,
        ),
    ),
    (
        EventCategory.NATIONALIST_SENTIMENT,
        re.compile(
            r"\b("
            r"defen[cs]e\s+spending|recruit\w+|parade|patriot\w+|"
            r"pride|alliance|NATO|allied|reinforc\w+|"
            r"deploy\w+|reservist\w*|volunteer\w*|standup|stand[- ]up|"
            r"summit"
            r")\b",
            re.IGNORECASE,
        ),
    ),
)


class GdeltLiveSource(IntelSource):
    name = "gdelt_live"

    def __init__(
        self,
        *,
        lookback_hours: int = 48,
        max_records_per_region: int = 75,
        min_abs_tone: float = 1.0,
        timeout_s: float = 10.0,
        region_queries: Iterable[_RegionQuery] | None = None,
    ) -> None:
        self._lookback_hours = max(1, int(lookback_hours))
        self._max_records = min(250, max(10, int(max_records_per_region)))
        self._min_abs_tone = float(min_abs_tone)
        self._timeout_s = float(timeout_s)
        self._regions = tuple(region_queries) if region_queries is not None else DEFAULT_REGION_QUERIES

    def fetch(self, now: datetime) -> list[Event]:  # noqa: ARG002 - timespan handles "now" implicitly
        events: list[Event] = []
        # GDELT routinely returns the same wire story syndicated across many
        # domains. Dedupe per (region, normalized title) keeping the earliest
        # publication time so the morale aggregator sees one signal per story.
        seen: dict[tuple[str, str], Event] = {}
        for rq in self._regions:
            articles = self._fetch_region(rq)
            for art in articles:
                ev = self._article_to_event(rq.region_id, art)
                if ev is None:
                    continue
                key = (rq.region_id, _norm_title(ev.headline))
                prev = seen.get(key)
                if prev is None or ev.ts < prev.ts:
                    seen[key] = ev

        events = sorted(seen.values(), key=lambda e: e.ts, reverse=True)
        log.info(
            "gdelt_live: fetched %d unique events across %d regions (lookback=%dh)",
            len(events),
            len(self._regions),
            self._lookback_hours,
        )
        return events

    def _fetch_region(self, rq: _RegionQuery) -> list[dict]:
        params = {
            "query": f"{rq.query} sourcelang:eng",
            "mode": "ArtList",
            "format": "json",
            "timespan": f"{self._lookback_hours}h",
            "maxrecords": str(self._max_records),
            "sort": "HybridRel",
        }
        url = f"{GDELT_DOC_API}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=self._timeout_s) as resp:
                body = resp.read().decode("utf-8", errors="replace")
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise RuntimeError(
                f"gdelt_live: failed to fetch region {rq.region_id!r}: {exc}"
            ) from exc

        if not body.strip():
            return []
        try:
            payload = json.loads(body)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"gdelt_live: malformed JSON for region {rq.region_id!r}: {exc}"
            ) from exc

        articles = payload.get("articles") if isinstance(payload, dict) else None
        if not isinstance(articles, list):
            return []
        return articles

    def _article_to_event(self, region_id: str, art: dict) -> Event | None:
        title = str(art.get("title") or "").strip()
        if not title:
            return None

        seen = art.get("seendate")
        ts = _parse_seendate(seen)
        if ts is None:
            return None

        category = _classify(title)
        if category is None:
            return None

        tone = _safe_float(art.get("tone"))
        if tone is not None:
            if abs(tone) < self._min_abs_tone:
                return None
            weight = _tone_to_weight(tone)
        else:
            weight = _category_to_weight(category, title)
        if weight == 0.0:
            return None

        url = str(art.get("url") or "").strip()
        ev_id = _stable_event_id(url or title, seen=str(seen))

        # GDELT URLs are sometimes protocol-relative or otherwise malformed;
        # the Event ctor will reject anything that isn't http(s)://, so guard
        # here to keep the article rather than drop it for a bad link.
        clean_url = url if url.startswith(("http://", "https://")) else None

        return Event(
            id=ev_id,
            region_id=region_id,
            ts=ts,
            category=category,
            headline=title[:200],
            snippet=str(art.get("domain") or "")[:120],
            weight=weight,
            source="gdelt",
            url=clean_url,
        )


def _safe_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_seendate(value: object) -> datetime | None:
    """Parse GDELT's compact `YYYYMMDDTHHMMSSZ` timestamp."""
    if not isinstance(value, str) or len(value) < 15:
        return None
    try:
        ts = datetime.strptime(value, "%Y%m%dT%H%M%SZ")
        return ts.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _classify(title: str) -> EventCategory | None:
    """Map an article title to an EventCategory. Returns None when nothing
    matches; the caller should drop the article so we don't pollute the
    aggregator with off-topic wire copy."""
    for category, pattern in _CATEGORY_PATTERNS:
        if pattern.search(title):
            return category
    return None


def _tone_to_weight(tone: float) -> float:
    """Map GDELT tone (~[-10, 10]) onto our signed weight in [-1, 1]."""
    w = tone / 5.0
    if w > 1.0:
        return 1.0
    if w < -1.0:
        return -1.0
    return round(w, 3)


# High-severity keywords that bump magnitude regardless of category.
_INTENSIFIER = re.compile(
    r"\b(killed|dead|deaths|massive|destroyed|major|crisis|unprecedented|"
    r"emergency|coup|invasion|war|critical|severe)\b",
    re.IGNORECASE,
)

# Per-category baseline magnitudes when GDELT doesn't expose tone.
_CATEGORY_BASE_MAG: dict[EventCategory, float] = {
    EventCategory.MILITARY_LOSS: 0.50,
    EventCategory.PROTEST: 0.40,
    EventCategory.POLITICAL_INSTABILITY: 0.35,
    EventCategory.ECONOMIC_STRESS: 0.30,
    EventCategory.NATIONALIST_SENTIMENT: 0.30,
}


def _category_to_weight(category: EventCategory, title: str) -> float:
    """Fallback weighting when no per-article tone is available.

    Sign comes from `DEFAULT_CATEGORY_SIGN`; magnitude is a category baseline
    bumped slightly when the headline contains high-severity keywords."""
    sign = DEFAULT_CATEGORY_SIGN.get(category, -1)
    mag = _CATEGORY_BASE_MAG.get(category, 0.30)
    if _INTENSIFIER.search(title):
        mag = min(1.0, mag + 0.20)
    return round(sign * mag, 3)


def _stable_event_id(seed: str, *, seen: str) -> str:
    h = hashlib.sha1(f"{seed}|{seen}".encode("utf-8")).hexdigest()[:12]
    return f"gdelt.live.{h}"


def _norm_title(title: str) -> str:
    """Lowercase + collapse whitespace + strip punctuation. Used as a dedup
    key so syndicated copies of the same wire story collapse into one event."""
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()
