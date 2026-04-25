"""AI agents (placeholder).

Future contents:

- `red_cell.py`: LLM-driven adversary that adapts to blue moves.
- `leader.py`: per-faction leader persona producing strategic decisions
  conditioned on intel signals (sentiment, protests, casualties).
- `adjudicator.py`: rapid LLM adjudication of ambiguous combat outcomes.

Pure consumers of `axis.domain` / `axis.units`; never import from `sim`
directly to keep the dependency graph one-way.
"""
