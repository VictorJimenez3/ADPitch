# sync-engine/check_db.py
import os
import sqlite3

DB_PATH = os.environ.get("SALESLENS_DB", os.path.join("sync-engine", "data", "adpitch.db"))

NEEDED_TABLES = {"sessions", "transcript_segments", "mood_samples", "speaker_map"}
NEEDED_VIEWS  = {"mood_20s", "speech_bucket", "seller_vs_client_mood"}

def main():
    print(f"[check] DB path: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        raise SystemExit("[error] DB file not found. Run: python sync-engine/init_db.py")

    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()

        # list tables + views
        cur.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY type, name;")
        rows = cur.fetchall()

        tables = {n for (n, t) in rows if t == "table"}
        views  = {n for (n, t) in rows if t == "view"}

        print("\n[tables found]")
        for n in sorted(tables):
            print(" -", n)

        print("\n[views found]")
        for n in sorted(views):
            print(" -", n)

        missing_tables = sorted(list(NEEDED_TABLES - tables))
        missing_views  = sorted(list(NEEDED_VIEWS  - views))

        print("\n[required tables]")
        for n in sorted(NEEDED_TABLES):
            print(" -", n, "OK" if n in tables else "MISSING")

        print("\n[required views]")
        for n in sorted(NEEDED_VIEWS):
            print(" -", n, "OK" if n in views else "MISSING")

        if missing_tables or missing_views:
            print("\n[status] Not ready.")
            if missing_tables:
                print("Missing tables:", ", ".join(missing_tables))
            if missing_views:
                print("Missing views:", ", ".join(missing_views))
            print("Fix: re-run init: python sync-engine/init_db.py")
        else:
            print("\n[status] DB is ready (tables + views present).")

    finally:
        conn.close()

if __name__ == "__main__":
    main()