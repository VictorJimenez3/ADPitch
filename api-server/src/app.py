"""
api-server/src/app.py — FastAPI REST API for the SalesLens dashboard.

Provides endpoints for managing sessions and retrieving analysis results.
The dashboard calls these endpoints to display data.

Run:
    cd api-server
    uvicorn src.app:app --reload --port 8000

Endpoints:
    POST   /sessions                → Create a new recording session
    GET    /sessions                → List all sessions
    GET    /sessions/{id}           → Get session details
    POST   /sessions/{id}/stop      → Stop recording + trigger analysis
    GET    /sessions/{id}/timeline   → Get merged timeline
    GET    /sessions/{id}/insights   → Get AI insights
"""

import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from shared.config import API_HOST, API_PORT

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "sync-engine" / "src"))
import db_manager
from timeline_builder import build_timeline

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "insights-engine" / "src"))
from analyzer import analyze_session


# ─── App Setup ──────────────────────────────────────────────

app = FastAPI(
    title="SalesLens API",
    description="Sales conversation intelligence powered by Presage + ElevenLabs + Claude",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Allow dashboard on any port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request/Response Models ────────────────────────────────

class CreateSessionRequest(BaseModel):
    customer_name: Optional[str] = None
    notes: Optional[str] = None

class CreateSessionResponse(BaseModel):
    session_id: str
    message: str


# ─── Session Endpoints ──────────────────────────────────────

@app.post("/sessions", response_model=CreateSessionResponse)
def create_session(req: CreateSessionRequest):
    """Create a new recording session. Returns session_id for capture modules."""
    session_id = db_manager.create_session(
        customer_name=req.customer_name,
        notes=req.notes,
    )
    return CreateSessionResponse(
        session_id=session_id,
        message=f"Session created. Start capture modules with --session-id {session_id}",
    )


@app.get("/sessions")
def list_sessions():
    """List all sessions, newest first."""
    return db_manager.list_sessions()


@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    """Get details for a specific session."""
    session = db_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.post("/sessions/{session_id}/stop")
def stop_session(session_id: str):
    """Stop a recording session and trigger AI analysis."""
    session = db_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Mark session as completed
    db_manager.stop_session(session_id)

    # Trigger AI analysis
    db_manager.update_session_status(session_id, "analyzing")
    try:
        result = analyze_session(session_id)
        if "error" in result:
            db_manager.update_session_status(session_id, "error")
            return {"status": "error", "detail": result["error"]}
        return {"status": "analyzed", "score": result.get("overall_score")}
    except Exception as e:
        db_manager.update_session_status(session_id, "error")
        return {"status": "error", "detail": str(e)}


# ─── Data Endpoints ─────────────────────────────────────────

@app.get("/sessions/{session_id}/timeline")
def get_timeline(session_id: str):
    """Get the merged timeline (transcript + physiology) for a session."""
    session = db_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return build_timeline(session_id)


@app.get("/sessions/{session_id}/insights")
def get_insights(session_id: str):
    """Get AI-generated insights for a session."""
    return db_manager.get_insights_for_session(session_id)


@app.get("/sessions/{session_id}/physiology")
def get_physiology(session_id: str):
    """Get raw physiology data for a session (for charts)."""
    return db_manager.get_physiology_for_session(session_id)


@app.get("/sessions/{session_id}/transcript")
def get_transcript(session_id: str):
    """Get raw transcript for a session."""
    return db_manager.get_transcript_for_session(session_id)


# ─── Health Check ───────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "saleslens-api"}
