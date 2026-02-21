"""
shared/models.py — Data models shared across all SalesLens modules.

These Pydantic models define the EXACT shape of data passed between modules.
If you change a field here, every module that uses it will need to update.

TEAM: Read this file to understand what data your module produces/consumes.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ─── Enums ──────────────────────────────────────────────────

class SessionStatus(str, Enum):
    RECORDING = "recording"
    COMPLETED = "completed"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    ERROR = "error"


class Speaker(str, Enum):
    SELLER = "seller"
    CUSTOMER = "customer"
    UNKNOWN = "unknown"


class InsightType(str, Enum):
    COACHING = "coaching"
    RISK = "risk"
    HIGHLIGHT = "highlight"
    SUMMARY = "summary"


class Severity(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    CONCERN = "concern"
    CRITICAL = "critical"


# ─── Data Models ────────────────────────────────────────────

class PhysiologyEvent(BaseModel):
    """
    Written by: presage-capture (C++ writes JSON, Python can also use this)
    Read by: sync-engine, api-server

    One row per ~1 second of Presage data.
    """
    session_id: str
    timestamp_ms: int                          # UTC milliseconds — THE SYNC KEY
    heart_rate: Optional[float] = None         # BPM
    hrv: Optional[float] = None                # Heart rate variability (ms)
    breathing_rate: Optional[float] = None     # Breaths per minute
    phasic: Optional[float] = None             # Relative blood pressure trend
    emotion_score: Optional[float] = None      # -1.0 (negative) to 1.0 (positive)
    engagement: Optional[float] = None         # 0.0 (disengaged) to 1.0 (locked in)
    blink_rate: Optional[float] = None         # Blinks per minute
    is_talking: Optional[bool] = None          # Is the subject currently speaking?
    raw_json: Optional[str] = None             # Full Presage output for debugging


class TranscriptSegment(BaseModel):
    """
    Written by: transcription (ElevenLabs)
    Read by: sync-engine, api-server

    One row per utterance/sentence.
    """
    session_id: str
    timestamp_start_ms: int                    # UTC milliseconds — start of utterance
    timestamp_end_ms: int                      # UTC milliseconds — end of utterance
    speaker: Speaker = Speaker.UNKNOWN         # Who said this
    text: str                                  # The transcribed text
    confidence: Optional[float] = None         # 0.0 to 1.0
    raw_json: Optional[str] = None             # Full ElevenLabs response


class Session(BaseModel):
    """
    Written by: api-server (on start/stop)
    Read by: all modules
    """
    session_id: str
    customer_name: Optional[str] = None
    start_time_ms: int
    end_time_ms: Optional[int] = None
    status: SessionStatus = SessionStatus.RECORDING
    notes: Optional[str] = None


class TimelineEntry(BaseModel):
    """
    Produced by: sync-engine (timeline_builder.py)
    Consumed by: insights-engine, dashboard

    This is the MERGED view — transcript + physiology together.
    """
    start_ms: int
    end_ms: int
    speaker: Speaker
    text: str
    physiology: dict = Field(default_factory=dict)
    # physiology contains: heart_rate, hrv, breathing_rate, phasic, emotion_score, engagement


class Insight(BaseModel):
    """
    Written by: insights-engine (Claude's analysis)
    Read by: api-server, dashboard
    """
    session_id: str
    insight_type: InsightType
    title: Optional[str] = None
    body: str
    severity: Severity = Severity.NEUTRAL
    timestamp_ref_ms: Optional[int] = None     # What moment does this insight reference?


class AnalysisResult(BaseModel):
    """
    The full output from Claude's analysis of a session.
    """
    session_id: str
    overall_score: int = Field(ge=0, le=100)   # 0-100 engagement score
    summary: str
    key_moments: list[dict]                     # Each has: timestamp_ms, type, what_happened, recommendation
    coaching_tips: list[str]
    unresolved_concerns: list[str]
