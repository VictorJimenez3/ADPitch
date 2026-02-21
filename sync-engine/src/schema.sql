-- sync-engine/src/schema.sql
-- ═══════════════════════════════════════════════════════════
-- SalesLens Database Schema
-- ═══════════════════════════════════════════════════════════
--
-- This is the CONTRACT between all modules. If you change this,
-- tell the whole team.
--
-- WHO WRITES WHAT:
--   sessions            → api-server (create/update)
--   physiology_events   → presage-capture (insert during recording)
--   transcript_segments → transcription (insert during recording)
--   insights            → insights-engine (insert after analysis)
--
-- HOW SYNC WORKS:
--   Both physiology_events and transcript_segments have UTC
--   millisecond timestamps. The sync-engine merges them by
--   finding physiology readings that OVERLAP each transcript
--   segment's time window.

PRAGMA journal_mode=WAL;  -- Allow concurrent reads + writes
PRAGMA busy_timeout=5000; -- Wait up to 5s if DB is locked

-- ─── Sessions ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
    session_id    TEXT PRIMARY KEY,
    customer_name TEXT,
    start_time_ms INTEGER NOT NULL,
    end_time_ms   INTEGER,
    status        TEXT DEFAULT 'recording'
                  CHECK(status IN ('recording','completed','analyzing','analyzed','error')),
    notes         TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Physiology Events (from Presage) ──────────────────────
-- Written by: presage-capture/src/db_writer.cpp
-- ~1 row per second during recording

CREATE TABLE IF NOT EXISTS physiology_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL REFERENCES sessions(session_id),
    timestamp_ms    INTEGER NOT NULL,   -- UTC millis — THE SYNC KEY
    heart_rate      REAL,               -- BPM
    hrv             REAL,               -- Heart rate variability (ms)
    breathing_rate  REAL,               -- Breaths per minute
    phasic          REAL,               -- Relative blood pressure trend
    emotion_score   REAL,               -- -1.0 to 1.0
    engagement      REAL,               -- 0.0 to 1.0
    blink_rate      REAL,               -- Blinks per minute
    is_talking      BOOLEAN,            -- Is subject currently speaking?
    raw_json        TEXT                 -- Full Presage output for debugging
);

-- ─── Transcript Segments (from ElevenLabs) ─────────────────
-- Written by: transcription/src/realtime_transcriber.py
-- ~1 row per utterance/sentence

CREATE TABLE IF NOT EXISTS transcript_segments (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id         TEXT NOT NULL REFERENCES sessions(session_id),
    timestamp_start_ms INTEGER NOT NULL,  -- UTC millis — start of utterance
    timestamp_end_ms   INTEGER NOT NULL,  -- UTC millis — end of utterance
    speaker            TEXT NOT NULL DEFAULT 'unknown'
                       CHECK(speaker IN ('seller','customer','unknown')),
    text               TEXT NOT NULL,
    confidence         REAL,
    raw_json           TEXT
);

-- ─── AI Insights (from Claude) ─────────────────────────────
-- Written by: insights-engine/src/analyzer.py
-- Created after session ends and analysis runs

CREATE TABLE IF NOT EXISTS insights (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id       TEXT NOT NULL REFERENCES sessions(session_id),
    insight_type     TEXT NOT NULL
                     CHECK(insight_type IN ('coaching','risk','highlight','summary')),
    title            TEXT,
    body             TEXT NOT NULL,
    severity         TEXT DEFAULT 'neutral'
                     CHECK(severity IN ('positive','neutral','concern','critical')),
    timestamp_ref_ms INTEGER,       -- What moment this insight references
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Indexes for fast timeline queries ─────────────────────
-- These are CRITICAL for the sync-engine's merge performance.

CREATE INDEX IF NOT EXISTS idx_physio_session_time
    ON physiology_events(session_id, timestamp_ms);

CREATE INDEX IF NOT EXISTS idx_transcript_session_time
    ON transcript_segments(session_id, timestamp_start_ms);

CREATE INDEX IF NOT EXISTS idx_insights_session
    ON insights(session_id);
