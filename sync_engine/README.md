# sync-engine/ + insights-engine/ — Data Sync & AI Analysis

**Owner:** Person 3
**Stack:** Python / SQLite / Claude API (Anthropic)
**Also owns:** `api-server/` and `shared/`

---

## What These Modules Do

**sync-engine:** The database layer + timeline merge logic. Takes raw physiology events and transcript segments (written by other modules) and merges them into a unified timeline by overlapping timestamps.

**insights-engine:** Sends the merged timeline to Claude AI, which produces coaching insights, flags concerning moments, and scores overall engagement.

## How It All Connects

```
presage-capture/ ──writes──→ physiology_events table ──┐
                                                         │
                                                         ├──→ timeline_builder.py ──→ analyzer.py ──→ Claude API
                                                         │         (merges by              │
transcription/   ──writes──→ transcript_segments table ──┘         timestamp)             │
                                                                                          ▼
                                                                                    insights table
                                                                                          │
                                                                                    api-server/
                                                                                          │
                                                                                    dashboard/
```

## Your Responsibilities

1. **Database schema** (`schema.sql`) — the contract between ALL modules
2. **DB access layer** (`db_manager.py`) — all Python modules import this
3. **Timeline builder** (`timeline_builder.py`) — the core sync logic
4. **AI analyzer** (`insights-engine/src/analyzer.py`) — Claude integration
5. **API server** (`api-server/src/app.py`) — REST endpoints for dashboard
6. **Shared config** (`shared/config.py`) — env vars, paths, constants

## Key Files

| File | What It Does |
|------|-------------|
| `sync-engine/src/schema.sql` | Database table definitions — DO NOT CHANGE without telling everyone |
| `sync-engine/src/init_db.py` | Creates the DB file. Run once at setup. |
| `sync-engine/src/db_manager.py` | Insert/query functions used by ALL Python modules |
| `sync-engine/src/timeline_builder.py` | Merges physiology + transcript by overlapping timestamps |
| `insights-engine/src/analyzer.py` | Sends timeline to Claude, parses response, saves insights |
| `api-server/src/app.py` | FastAPI REST endpoints |
| `shared/config.py` | Single source of truth for paths, keys, constants |
| `shared/models.py` | Pydantic data models (optional but useful for validation) |

## Setup

```bash
# Initialize the database (do this first, everyone else depends on it)
cd sync-engine
pip install -r requirements.txt
python src/init_db.py

# Run the API server
cd ../api-server
pip install -r requirements.txt
uvicorn src.app:app --reload --port 8000
```

## How Sync Works (The Key Insight)

Both presage-capture and transcription write to the SAME SQLite file with UTC millisecond timestamps. The timeline builder merges them:

```
physiology_events:     |--HR:72--|--HR:78--|--HR:81--|--HR:76--|
                       t=1000    t=2000    t=3000    t=4000

transcript_segments:        |----"pricing seems high"-----|
                            t=1500                    t=3500

Merge result:
  "pricing seems high" → avg(HR between 1500-3500) = avg(78, 81) = 79.5
                        → emotion, hrv, etc. also averaged
```

This is simple, robust, and doesn't need any message queue.
