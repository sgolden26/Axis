"""Typer CLI: `python -m axis ...` entry point."""

from __future__ import annotations

from pathlib import Path

import typer

from axis import scenarios
from axis.serialization.snapshot import SnapshotExporter

app = typer.Typer(add_completion=False, help="Axis wargame backend CLI.")


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
) -> None:
    """Build the named scenario and write a JSON snapshot."""
    builder_fn = scenarios.get(scenario)
    theater = builder_fn()
    exporter = SnapshotExporter(theater)
    written = exporter.write(out)
    typer.echo(f"Wrote {written.resolve()}")


@app.command(name="list")
def list_scenarios() -> None:
    """List available scenario ids."""
    for sid in sorted(scenarios.SCENARIOS):
        typer.echo(sid)


def main() -> None:
    app()


if __name__ == "__main__":
    main()
