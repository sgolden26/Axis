# data/

Generated scenario snapshots live here. Regenerate with:

```bash
cd backend && python -m axis export --scenario eastern_europe --out ../data/state.json
```

The frontend's `predev` script copies `state.json` from this directory into `frontend/public/`.
