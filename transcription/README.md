# transcription/ — ElevenLabs Speech-to-Text

**Owner:** Person 2
**Stack:** Python / ElevenLabs Scribe v2 / PyAudio / SQLite
**ElevenLabs STT Docs:** https://elevenlabs.io/docs/capabilities/speech-to-text
**Realtime WebSocket Docs:** https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime

---

## What This Module Does

Captures microphone audio and sends it to ElevenLabs for real-time transcription, then writes timestamped transcript segments to the shared SQLite database.

## How It Connects

```
Microphone
    │
    ▼
┌──────────────────┐     WebSocket (150ms latency)     ┌─────────────────┐
│  PyAudio captures │ ──────────────────────────────── │ ElevenLabs       │
│  audio chunks     │                                   │ Scribe v2        │
│                   │ ◄──────────────────────────────── │ Realtime         │
│  Receives text +  │     committed_transcript          │                  │
│  timestamps       │     with word timestamps          │                  │
└────────┬─────────┘                                    └─────────────────┘
         │
         │ Writes to transcript_segments table
         ▼
┌─────────────────┐
│   SQLite DB      │ ← sync-engine/data/adpitch.db
│                  │   (Same file that presage-capture writes to)
└─────────────────┘
```

**YOUR OUTPUT:** Rows in the `transcript_segments` table with:
- `session_id` — passed as command line arg
- `timestamp_start_ms` / `timestamp_end_ms` — **UTC milliseconds** (THE SYNC KEY)
- `speaker` — "seller", "customer", or "unknown"
- `text` — the transcribed sentence/utterance
- `confidence` — from ElevenLabs (optional)

## Two Approaches (Pick One)

### Option A: Realtime WebSocket (Recommended)
- 150ms latency, streams as you talk
- Uses `scribe_v2_realtime` model
- No speaker diarization (you'll need to handle this manually)
- Word-level timestamps available
- File: `src/realtime_transcriber.py`

### Option B: Batch API (Simpler, Post-Call)
- Record audio file during conversation, transcribe after
- Uses `scribe_v2` model
- HAS speaker diarization built-in (up to 48 speakers)
- Better accuracy, but not real-time
- File: `src/batch_transcriber.py`

**For the hackathon:** Start with Option B (simpler). Switch to Option A if you want live transcription in the dashboard.

## Speaker Identification Strategy

**Realtime (no built-in diarization):**
- Use 2 microphones (one for seller, one for customer) on separate channels
- OR: Assume alternating speakers based on pause detection
- OR: Let the seller tag speakers manually in the dashboard post-call

**Batch (has diarization):**
- ElevenLabs auto-labels speakers as speaker_0, speaker_1
- First speaker is likely the seller (they initiate)
- Confirm mapping via dashboard after call

## Setup

```bash
cd transcription
pip install -r requirements.txt

# Test with batch transcription
python src/batch_transcriber.py --session-id test123 --audio-file test.mp3

# Or run realtime
python src/realtime_transcriber.py --session-id test123
```

## ElevenLabs API Details

**Realtime WebSocket endpoint:**
```
wss://api.elevenlabs.io/v1/speech-to-text/realtime
  ?model_id=scribe_v2_realtime
  &language_code=en
  &include_timestamps=true
```

**Authentication:** Pass `xi-api-key` header with your API key.

**Message types you send:**
```json
{
    "message_type": "input_audio_chunk",
    "audio_base_64": "<base64 encoded PCM audio>",
    "sample_rate": 16000
}
```

**Message types you receive:**
```json
{
    "message_type": "committed_transcript_with_timestamps",
    "text": "The pricing seems high",
    "words": [
        {"text": "The", "start": 0.0, "end": 0.12, "type": "word"},
        {"text": "pricing", "start": 0.18, "end": 0.52, "type": "word"},
        ...
    ]
}
```

## Key Implementation Notes

1. **Timestamps must be UTC milliseconds.** ElevenLabs returns relative timestamps (seconds from stream start). Convert: `utc_ms = session_start_ms + (word_start_seconds * 1000)`

2. **The DB path is:** `../sync-engine/data/ADPitch.db` — or import from `shared/config.py`

3. **Audio format:** ElevenLabs realtime expects PCM 16kHz mono. PyAudio can capture this directly.

4. **Audio events:** ElevenLabs can detect laughter, pauses, and other events. Set `tag_audio_events=True` in batch mode — these are useful engagement signals!
