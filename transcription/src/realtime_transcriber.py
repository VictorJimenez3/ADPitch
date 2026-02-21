"""
transcription/src/realtime_transcriber.py — Real-time transcription via ElevenLabs WebSocket.

Captures microphone audio, streams it to ElevenLabs Scribe v2 Realtime,
and writes committed transcripts to the shared SQLite database.

Usage:
    python src/realtime_transcriber.py --session-id abc123

HOW TIMESTAMPS SYNC WITH PRESAGE:
    ElevenLabs returns word timestamps relative to the stream start.
    We convert these to UTC milliseconds:
        utc_ms = session_start_epoch_ms + (elevenlabs_word_start_sec * 1000)
    
    Presage writes UTC milliseconds directly.
    The sync-engine merges them by overlapping time windows.
"""

import asyncio
import json
import base64
import time
import sys
import argparse
from pathlib import Path

import websockets
import pyaudio

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from shared.config import ELEVENLABS_API_KEY, ELEVENLABS_STT_SAMPLE_RATE, DB_PATH

# Add sync-engine to path for db_manager
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "sync-engine" / "src"))
import db_manager


# ─── Audio Config ───────────────────────────────────────────
CHUNK_SIZE = 4096           # Samples per buffer
SAMPLE_RATE = 16000         # ElevenLabs requires 16kHz
CHANNELS = 1                # Mono
FORMAT = pyaudio.paInt16    # 16-bit PCM

# ─── ElevenLabs WebSocket Config ────────────────────────────
WS_URL = (
    "wss://api.elevenlabs.io/v1/speech-to-text/realtime"
    "?model_id=scribe_v2_realtime"
    "&language_code=en"
    "&include_timestamps=true"
)


async def run_transcription(session_id: str):
    """Main loop: capture audio → stream to ElevenLabs → write to DB."""

    # Record the start time so we can convert relative timestamps to UTC
    stream_start_epoch_ms = int(time.time() * 1000)

    print(f"🎙️  Starting real-time transcription for session: {session_id}")
    print(f"   Stream start: {stream_start_epoch_ms} (UTC ms)")
    print(f"   Press Ctrl+C to stop.\n")

    # Open microphone
    pa = pyaudio.PyAudio()
    audio_stream = pa.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=CHUNK_SIZE,
    )

    # Connect to ElevenLabs WebSocket
    headers = {"xi-api-key": ELEVENLABS_API_KEY}

    async with websockets.connect(WS_URL, extra_headers=headers) as ws:
        print("✅ Connected to ElevenLabs Scribe v2 Realtime")

        # Wait for session_started message
        init_msg = await ws.recv()
        init_data = json.loads(init_msg)
        print(f"   Session: {init_data.get('session_id', 'unknown')}")

        # Run send and receive concurrently
        await asyncio.gather(
            _send_audio(ws, audio_stream),
            _receive_transcripts(ws, session_id, stream_start_epoch_ms),
        )


async def _send_audio(ws, audio_stream):
    """Continuously read from microphone and send to ElevenLabs."""
    try:
        while True:
            # Read audio chunk (blocking, but fast)
            audio_data = audio_stream.read(CHUNK_SIZE, exception_on_overflow=False)

            # Encode as base64 and send
            audio_b64 = base64.b64encode(audio_data).decode("utf-8")
            message = {
                "message_type": "input_audio_chunk",
                "audio_base_64": audio_b64,
                "sample_rate": SAMPLE_RATE,
            }
            await ws.send(json.dumps(message))

            # Small yield to let receive task run
            await asyncio.sleep(0.01)

    except asyncio.CancelledError:
        pass


async def _receive_transcripts(ws, session_id: str, stream_start_ms: int):
    """Receive transcripts from ElevenLabs and write to database."""
    try:
        async for message in ws:
            data = json.loads(message)
            msg_type = data.get("message_type")

            if msg_type == "committed_transcript_with_timestamps":
                text = data.get("text", "").strip()
                if not text:
                    continue

                words = data.get("words", [])

                # Calculate UTC timestamps from relative word timestamps
                if words:
                    # First word start → segment start
                    first_word_start = words[0].get("start", 0)
                    last_word_end = words[-1].get("end", first_word_start + 0.5)

                    start_ms = stream_start_ms + int(first_word_start * 1000)
                    end_ms = stream_start_ms + int(last_word_end * 1000)
                else:
                    # Fallback: use current time
                    start_ms = int(time.time() * 1000)
                    end_ms = start_ms + 500

                # Write to database
                # NOTE: Speaker defaults to "unknown" — see README for diarization strategies
                db_manager.insert_transcript_segment(
                    session_id=session_id,
                    timestamp_start_ms=start_ms,
                    timestamp_end_ms=end_ms,
                    speaker="unknown",  # TODO: implement speaker identification
                    text=text,
                    confidence=None,
                    raw_json=json.dumps(data),
                )

                # Print for monitoring
                offset_sec = (start_ms - stream_start_ms) / 1000
                print(f"  [{offset_sec:6.1f}s] {text}")

            elif msg_type == "partial_transcript":
                # Show partial transcripts for live feedback (don't save to DB)
                partial = data.get("text", "")
                if partial:
                    print(f"  ... {partial}", end="\r")

    except asyncio.CancelledError:
        pass


def main():
    parser = argparse.ArgumentParser(description="SalesLens Realtime Transcription")
    parser.add_argument("--session-id", required=True, help="Session ID from api-server")
    args = parser.parse_args()

    if not ELEVENLABS_API_KEY:
        print("❌ ELEVENLABS_API_KEY not set. Check your .env file.")
        sys.exit(1)

    try:
        asyncio.run(run_transcription(args.session_id))
    except KeyboardInterrupt:
        print("\n\n🛑 Transcription stopped.")


if __name__ == "__main__":
    main()
