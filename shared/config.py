"""
shared/config.py — Single source of truth for all SalesLens modules.

Every Python module imports from here. If you need to change a path,
API key, or constant, change it HERE and it propagates everywhere.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# ─── API Keys ───────────────────────────────────────────────
PRESAGE_API_KEY = os.getenv("PRESAGE_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# ─── Database ───────────────────────────────────────────────
# All modules read/write to this same SQLite file.
# This is the ONLY place the DB path is defined.
DB_PATH = PROJECT_ROOT / os.getenv("DB_PATH", "sync-engine/data/saleslens.db")

# ─── ElevenLabs STT Config ──────────────────────────────────
ELEVENLABS_STT_MODEL = "scribe_v2"               # Batch (post-call, has speaker diarization)
ELEVENLABS_STT_REALTIME_MODEL = "scribe_v2_realtime"  # Realtime WebSocket (150ms latency)
ELEVENLABS_STT_WS_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"
ELEVENLABS_STT_SAMPLE_RATE = 16000

# ─── Presage Config ─────────────────────────────────────────
PRESAGE_CAMERA_INDEX = 0        # Default webcam. Change if using external camera.
PRESAGE_METRICS_INTERVAL_MS = 1000  # How often Presage emits metrics (~1/sec)

# ─── Claude Config ──────────────────────────────────────────
CLAUDE_MODEL = "claude-sonnet-4-5-20250514"
CLAUDE_MAX_TOKENS = 4096

# ─── API Server ─────────────────────────────────────────────
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
