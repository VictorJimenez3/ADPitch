"""
sync-engine/src/db_manager.py — Shared database access layer.

ALL Python modules use this to read/write the SQLite database.
This ensures consistent connection settings (WAL mode, busy timeout)
and provides helper functions for common operations.

USED BY: transcription, sync-engine, insights-engine, api-server
"""

import sqlite3
import json
import uuid
import time
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from shared.config import DB_PATH


def get_connection() -> sqlite3.Connection:
    """Get a database connection with proper settings for concurrent access."""
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row  # Return dicts instead of tuples
    return conn


# ─── Session Operations (used by api-server) ───────────────

def create_session(customer_name: Optional[str] = None, notes: Optional[str] = None) -> str:
    """Create a new recording session. Returns session_id."""
    session_id = str(uuid.uuid4())[:8]  # Short ID for hackathon convenience
    start_time_ms = int(time.time() * 1000)

    conn = get_connection()
    conn.execute(
        "INSERT INTO sessions (session_id, customer_name, start_time_ms, status, notes) VALUES (?, ?, ?, 'recording', ?)",
        (session_id, customer_name, start_time_ms, notes)
    )
    conn.commit()
    conn.close()
    return session_id


def stop_session(session_id: str):
    """Mark a session as completed."""
    end_time_ms = int(time.time() * 1000)
    conn = get_connection()
    conn.execute(
        "UPDATE sessions SET end_time_ms = ?, status = 'completed' WHERE session_id = ?",
        (end_time_ms, session_id)
    )
    conn.commit()
    conn.close()


def get_session(session_id: str) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def list_sessions() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM sessions ORDER BY start_time_ms DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_session_status(session_id: str, status: str):
    conn = get_connection()
    conn.execute("UPDATE sessions SET status = ? WHERE session_id = ?", (status, session_id))
    conn.commit()
    conn.close()


# ─── Physiology Operations (used by presage-capture) ────────

def insert_physiology_event(
    session_id: str,
    timestamp_ms: int,
    heart_rate: float = None,
    hrv: float = None,
    breathing_rate: float = None,
    phasic: float = None,
    emotion_score: float = None,
    engagement: float = None,
    blink_rate: float = None,
    is_talking: bool = None,
    raw_json: str = None
):
    """Insert a single physiology reading. Called ~1x/second by presage-capture."""
    conn = get_connection()
    conn.execute(
        """INSERT INTO physiology_events
           (session_id, timestamp_ms, heart_rate, hrv, breathing_rate,
            phasic, emotion_score, engagement, blink_rate, is_talking, raw_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (session_id, timestamp_ms, heart_rate, hrv, breathing_rate,
         phasic, emotion_score, engagement, blink_rate, is_talking, raw_json)
    )
    conn.commit()
    conn.close()


# ─── Transcript Operations (used by transcription) ─────────

def insert_transcript_segment(
    session_id: str,
    timestamp_start_ms: int,
    timestamp_end_ms: int,
    speaker: str = "unknown",
    text: str = "",
    confidence: float = None,
    raw_json: str = None
):
    """Insert a transcript segment. Called per utterance by transcription module."""
    conn = get_connection()
    conn.execute(
        """INSERT INTO transcript_segments
           (session_id, timestamp_start_ms, timestamp_end_ms, speaker, text, confidence, raw_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (session_id, timestamp_start_ms, timestamp_end_ms, speaker, text, confidence, raw_json)
    )
    conn.commit()
    conn.close()


# ─── Timeline Operations (used by sync-engine) ─────────────

def get_physiology_for_session(session_id: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM physiology_events WHERE session_id = ? ORDER BY timestamp_ms",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_transcript_for_session(session_id: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM transcript_segments WHERE session_id = ? ORDER BY timestamp_start_ms",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_physiology_in_range(session_id: str, start_ms: int, end_ms: int) -> list[dict]:
    """Get physiology readings that overlap a time window. Used for timeline merge."""
    conn = get_connection()
    rows = conn.execute(
        """SELECT * FROM physiology_events
           WHERE session_id = ? AND timestamp_ms BETWEEN ? AND ?
           ORDER BY timestamp_ms""",
        (session_id, start_ms, end_ms)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─── Insight Operations (used by insights-engine) ──────────

def insert_insight(
    session_id: str,
    insight_type: str,
    body: str,
    title: str = None,
    severity: str = "neutral",
    timestamp_ref_ms: int = None
):
    conn = get_connection()
    conn.execute(
        """INSERT INTO insights
           (session_id, insight_type, title, body, severity, timestamp_ref_ms)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (session_id, insight_type, title, body, severity, timestamp_ref_ms)
    )
    conn.commit()
    conn.close()


def get_insights_for_session(session_id: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM insights WHERE session_id = ? ORDER BY created_at",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
