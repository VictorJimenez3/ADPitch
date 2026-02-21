# insights-engine/ — AI Analysis with Claude

**Owner:** Person 3 (same as sync-engine)

Sends the merged timeline to Claude API and saves structured coaching insights.
See `sync-engine/README.md` for the full context.

## Usage

```bash
# Analyze a completed session
python src/analyzer.py --session-id abc123
```

This is also triggered automatically by `api-server` when you call `POST /sessions/{id}/stop`.
