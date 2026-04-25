"""Intel / political layer (placeholder).

Future contents:

- `gdelt.py`, `acled.py`: ingestion clients for public conflict-event APIs.
- `sentiment.py`: per-region sentiment scores from news scraping.
- `morale.py`: maps political signals onto Unit.morale and faction posture.
- `protests.py`: domestic-protest detection feeding leader pressure scores.

Strictly separated from `axis.sim` so the simulation can run with or without
live intel signals (deterministic replay vs. live mode).
"""
