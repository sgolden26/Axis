"""Simulation engine (placeholder).

Future contents:

- `engine.py`: turn-based loop driving Theater state forward.
- `kinetics.py`: combat resolution between Units.
- `movement.py`: pathing across terrain, with domain-specific costs.
- `adjudication.py`: optional LLM-backed white-cell adjudicator.

Designed to depend only on `axis.domain` and `axis.units`. The intel layer
feeds into morale/readiness via well-defined hooks defined here later.
"""
