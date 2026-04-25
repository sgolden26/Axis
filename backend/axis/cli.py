"""Typer CLI: `python -m axis ...` entry point."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from pathlib import Path

import typer

from axis import scenarios
from axis.intel.pipeline import IntelPipeline, build_source, default_region_ids
from axis.serialization.snapshot import SnapshotExporter

app = typer.Typer(add_completion=False, help="Axis wargame backend CLI.")
intel_app = typer.Typer(add_completion=False, help="Intel / morale pipeline.")
app.add_typer(intel_app, name="intel")


@app.command()
def export(
    scenario: str = typer.Option(
        "eastern_europe",
        "--scenario",
        "-s",
        help="Scenario id to export.",
    ),
    out: Path = typer.Option(
        Path("../data/state.json"),
        "--out",
        "-o",
        help="Output JSON path (relative to cwd).",
    ),
    intel_out: Path = typer.Option(
        Path("../data/intel.json"),
        "--intel-out",
        help="Where to write intel.json. Pass empty string to skip.",
    ),
    intel_source: str = typer.Option(
        "curated",
        "--source",
        help="Intel source: curated | gdelt_snapshot | gdelt_live.",
    ),
) -> None:
    """Build the named scenario and write JSON snapshots (state + intel)."""
    builder_fn = scenarios.get(scenario)
    theater = builder_fn()
    exporter = SnapshotExporter(theater)
    written = exporter.write(out)
    typer.echo(f"Wrote {written.resolve()}")

    if intel_out and str(intel_out):
        pipeline = IntelPipeline(
            source=build_source(intel_source),
            region_ids=tuple(default_region_ids()),
        )
        intel_path = pipeline.write(intel_out)
        typer.echo(f"Wrote {intel_path.resolve()} (source={intel_source})")


@app.command(name="list")
def list_scenarios() -> None:
    """List available scenario ids."""
    for sid in sorted(scenarios.SCENARIOS):
        typer.echo(sid)


@intel_app.command("export")
def intel_export(
    source: str = typer.Option(
        "curated",
        "--source",
        help="Intel source: curated | gdelt_snapshot | gdelt_live.",
    ),
    out: Path = typer.Option(
        Path("../data/intel.json"),
        "--out",
        "-o",
        help="Output intel.json path.",
    ),
) -> None:
    """Run the intel pipeline once and write intel.json."""
    pipeline = IntelPipeline(
        source=build_source(source),
        region_ids=tuple(default_region_ids()),
    )
    written = pipeline.write(out)
    typer.echo(f"Wrote {written.resolve()} (source={source})")


@intel_app.command("tick")
def intel_tick(
    source: str = typer.Option(
        "curated",
        "--source",
        help="Intel source: curated | gdelt_snapshot | gdelt_live.",
    ),
    out: Path = typer.Option(
        Path("../data/intel.json"),
        "--out",
        "-o",
        help="Output intel.json path.",
    ),
    interval: float = typer.Option(
        5.0,
        "--interval",
        help="Seconds between writes.",
    ),
    iterations: int = typer.Option(
        0,
        "--iterations",
        "-n",
        help="Number of ticks before exit. 0 = run forever.",
    ),
) -> None:
    """Re-export intel.json on a timer so the FE polling loop sees fresh data."""
    pipeline = IntelPipeline(
        source=build_source(source),
        region_ids=tuple(default_region_ids()),
    )
    seq = 0
    typer.echo(
        f"intel tick: source={source}, interval={interval}s, out={out}. Ctrl-C to stop."
    )
    try:
        while True:
            seq += 1
            now = datetime.now(tz=timezone.utc)
            pipeline.write(out, now=now, tick_seq=seq)
            typer.echo(f"  [{now.isoformat()}] tick #{seq} written")
            if iterations and seq >= iterations:
                return
            time.sleep(interval)
    except KeyboardInterrupt:
        typer.echo("intel tick: stopped.")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
