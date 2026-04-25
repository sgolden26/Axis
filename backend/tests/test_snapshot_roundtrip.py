import json
from pathlib import Path

from axis import SCHEMA_VERSION, scenarios
from axis.serialization.snapshot import SnapshotExporter


def test_eastern_europe_snapshot_shape(tmp_path: Path):
    theater = scenarios.get("eastern_europe")()
    exporter = SnapshotExporter(theater)
    out = tmp_path / "state.json"
    exporter.write(out)

    payload = json.loads(out.read_text())
    assert payload["schema_version"] == SCHEMA_VERSION
    assert payload["scenario"]["id"] == "eastern_europe"
    assert {f["id"] for f in payload["factions"]} >= {"nato", "ru"}
    assert len(payload["cities"]) >= 5
    assert len(payload["territories"]) >= 3
    assert len(payload["units"]) >= 5
    for u in payload["units"]:
        assert u["domain"] in {"ground", "air", "naval"}
        for key in ("strength", "readiness", "morale"):
            assert 0.0 <= u[key] <= 1.0
