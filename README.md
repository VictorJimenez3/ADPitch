# 🔍 ADPitch — AI-Powered Sales Conversation Intelligence

**ADP Hackathon Project** — Help the sales team remember, find, and reuse what they already know about customers.

## What It Does

ADPitch uses a camera + microphone during a sales conversation to capture:
1. **Customer physiology** (Presage SmartSpectra) — heart rate, HRV, stress, engagement, emotions
2. **Conversation transcript** (ElevenLabs Scribe v2) — real-time speech-to-text with word timestamps

After the conversation ends, these two data streams are **synced by timestamp** and fed to **Claude AI**, which generates actionable coaching insights like:
- "Customer's heart rate spiked when you mentioned pricing at 2:32 — consider leading with ROI next time"
- "Engagement dropped during the feature demo — try asking more questions to keep them involved"

---

## Architecture Overview

```
Camera ──→ [presage-capture] ──→ ┐
                                  ├──→ [SQLite DB] ──→ [insights-engine] ──→ [dashboard]
Microphone ──→ [transcription] ──→ ┘         ↑                │
                                        [sync-engine]    [api-server]
```

**How sync works:** Both capture modules write UTC-timestamped events to the SAME SQLite database file. The sync-engine merges them by overlapping time windows. No message queue, no Slack, no network — just shared timestamps.

---

## Team Assignments

| Folder | Owner | What You Build | Stack |
|--------|-------|---------------|-------|
| `presage-capture/` | **Person 1** | Camera → physiology metrics → DB | C++ / SmartSpectra SDK |
| `transcription/` | **Person 2** | Microphone → transcript → DB | Python / ElevenLabs SDK |
| `sync-engine/` + `insights-engine/` | **Person 3** | DB merge + Claude AI analysis | Python / SQLite / Claude API |
| `dashboard/` + `api-server/` | **Person 4** | Web UI + REST API | React + Python / FastAPI |

**Every folder has its own README** explaining exactly what to build, how it connects to the others, and what data format to use. Read YOUR folder's README first, then skim the others.

---

## Quick Start

### 1. Clone & Configure
```bash
git clone <repo-url>
cd ADPitch
cp .env.example .env
# Fill in your API keys (see below)
```

### 2. Initialize the Database (Person 3 does this first, everyone pulls)
```bash
cd sync-engine
pip install -r requirements.txt
python src/init_db.py
```

### 3. Each Person Starts Their Module
```bash
# Person 1:
cd presage-capture && bash scripts/install_sdk.sh

# Person 2:
cd transcription && pip install -r requirements.txt

# Person 3:
cd api-server && pip install -r requirements.txt

# Person 4:
cd dashboard && npm install
```

### 4. Run Everything (each in its own terminal)
```bash
# Terminal 1 — Presage camera capture
cd presage-capture && ./build/ADPitch_capture

# Terminal 2 — ElevenLabs transcription
cd transcription && python src/realtime_transcriber.py

# Terminal 3 — API server
cd api-server && uvicorn src.app:app --reload --port 8000

# Terminal 4 — Dashboard
cd dashboard && npm run dev
```

---

## API Keys Needed

| Service | Get It Here | Used By |
|---------|------------|---------|
| Presage SmartSpectra | https://physiology.presagetech.com/auth/register | presage-capture |
| ElevenLabs | https://elevenlabs.io/app/settings/api-keys | transcription |
| Anthropic (Claude) | https://console.anthropic.com/settings/keys | insights-engine |

---

## Database Location

The SQLite database lives at `sync-engine/data/ADPitch.db`. This path is configured in `shared/config.py` and used by ALL modules. The DB file is gitignored — each dev generates it locally with `python sync-engine/src/init_db.py`.

---

## Git Workflow

Each person works in their own folder to avoid merge conflicts:
```
git checkout -b feature/presage-capture    # Person 1
git checkout -b feature/transcription      # Person 2
git checkout -b feature/sync-insights      # Person 3
git checkout -b feature/dashboard-api      # Person 4
```

Shared files (`shared/`, `sync-engine/src/schema.sql`) should be edited by Person 3 and pulled by everyone else.
