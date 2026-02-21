"""
sync-engine/src/init_db.py — Initialize the SalesLens database.

Run this ONCE at project setup. It creates the SQLite DB file
and applies the schema. Safe to run multiple times (uses IF NOT EXISTS).

Usage:
    cd saleslens
    python sync-engine/src/init_db.py
"""

import sqlite3
import sys
from pathlib import Path

# Add project root to path so we can import shared/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from shared.config import DB_PATH


def init_database():
    # Ensure the data directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    schema_path = Path(__file__).parent / "schema.sql"
    schema_sql = schema_path.read_text()

    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript(schema_sql)
    conn.close()

    print(f"✅ Database initialized at: {DB_PATH}")
    print(f"   Tables: sessions, physiology_events, transcript_segments, insights")


if __name__ == "__main__":
    init_database()
