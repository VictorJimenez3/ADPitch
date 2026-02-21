"""
insights-engine/src/analyzer.py — Sends merged timeline to Claude for analysis.

This is where the magic happens. Claude reads the conversation + physiology
data and produces actionable coaching insights for the seller.

Usage:
    python src/analyzer.py --session-id abc123
"""

import json
import sys
import argparse
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from shared.config import ANTHROPIC_API_KEY, CLAUDE_MODEL, CLAUDE_MAX_TOKENS

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "sync-engine" / "src"))
import db_manager
from timeline_builder import build_timeline, format_timeline_for_display


SYSTEM_PROMPT = """You are a sales coaching AI for ADP's sales team. You analyze sales conversations
where each segment includes what was said AND the customer's physiological response
(heart rate, HRV, stress levels, emotional state, engagement level) captured by camera.

Your job is to help sellers improve by identifying patterns between what they say
and how the customer physically responds.

IMPORTANT CONTEXT:
- Heart rate spikes often indicate stress, surprise, or strong emotion
- Low HRV (heart rate variability) indicates stress; high HRV indicates relaxation
- Breathing rate increases suggest anxiety or excitement
- Phasic (relative blood pressure) trends show emotional arousal over time
- Emotion scores range from -1.0 (very negative) to 1.0 (very positive)
- Engagement scores range from 0.0 (disengaged) to 1.0 (fully engaged)

Be specific, actionable, and encouraging. Reference exact moments in the conversation."""


ANALYSIS_PROMPT = """Analyze this sales conversation timeline. Each entry shows what was said
and the customer's real-time physiological response.

Respond ONLY in valid JSON with this exact structure:
{{
  "overall_score": <0-100 engagement score>,
  "summary": "<2-3 sentence summary of how the conversation went>",
  "key_moments": [
    {{
      "timestamp_ms": <UTC ms of the moment>,
      "type": "<concern | positive | missed_opportunity>",
      "what_happened": "<what was said and the physical reaction>",
      "physiological_evidence": "<specific metrics that changed>",
      "recommendation": "<what the seller should do differently>"
    }}
  ],
  "coaching_tips": ["<specific, actionable tip>", "..."],
  "unresolved_concerns": ["<customer concern that wasn't addressed>", "..."]
}}

TIMELINE DATA:
{timeline}"""


def analyze_session(session_id: str) -> dict:
    """Run Claude analysis on a completed session."""

    # Build the merged timeline
    timeline = build_timeline(session_id)
    if not timeline:
        return {"error": "No timeline data found for this session"}

    # Get session info for formatting
    session = db_manager.get_session(session_id)
    if not session:
        return {"error": "Session not found"}

    # Format timeline for Claude
    formatted = format_timeline_for_display(timeline, session["start_time_ms"])

    # Call Claude
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": ANALYSIS_PROMPT.format(timeline=formatted)
        }]
    )

    # Parse Claude's JSON response
    response_text = response.content[0].text

    # Strip markdown code fences if present
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text.rsplit("```", 1)[0]

    try:
        result = json.loads(response_text.strip())
    except json.JSONDecodeError:
        return {"error": "Failed to parse Claude response", "raw": response_text}

    # Save insights to database
    _save_insights(session_id, result)

    # Update session status
    db_manager.update_session_status(session_id, "analyzed")

    return result


def _save_insights(session_id: str, result: dict):
    """Save Claude's analysis results as insight rows in the database."""

    # Save summary
    db_manager.insert_insight(
        session_id=session_id,
        insight_type="summary",
        title=f"Score: {result.get('overall_score', '?')}/100",
        body=result.get("summary", ""),
        severity="positive" if result.get("overall_score", 0) >= 70 else "concern",
    )

    # Save key moments
    for moment in result.get("key_moments", []):
        db_manager.insert_insight(
            session_id=session_id,
            insight_type="risk" if moment["type"] == "concern" else "highlight",
            title=moment.get("what_happened", "")[:100],
            body=moment.get("recommendation", ""),
            severity="concern" if moment["type"] == "concern" else "positive",
            timestamp_ref_ms=moment.get("timestamp_ms"),
        )

    # Save coaching tips
    for tip in result.get("coaching_tips", []):
        db_manager.insert_insight(
            session_id=session_id,
            insight_type="coaching",
            body=tip,
            severity="neutral",
        )


def main():
    parser = argparse.ArgumentParser(description="SalesLens AI Insights Engine")
    parser.add_argument("--session-id", required=True, help="Session ID to analyze")
    args = parser.parse_args()

    if not ANTHROPIC_API_KEY:
        print("❌ ANTHROPIC_API_KEY not set. Check your .env file.")
        sys.exit(1)

    print(f"🧠 Analyzing session {args.session_id}...")
    result = analyze_session(args.session_id)

    if "error" in result:
        print(f"❌ {result['error']}")
    else:
        print(f"\n✅ Analysis complete!")
        print(f"   Score: {result['overall_score']}/100")
        print(f"   Summary: {result['summary']}")
        print(f"   Key moments: {len(result.get('key_moments', []))}")
        print(f"   Coaching tips: {len(result.get('coaching_tips', []))}")


if __name__ == "__main__":
    main()
