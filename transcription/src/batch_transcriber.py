"""
transcription/src/batch_transcriber.py — Post-call batch transcription via ElevenLabs.

Records audio during the conversation, then sends the full file to
ElevenLabs Scribe v2 batch API for transcription WITH speaker diarization.

This is SIMPLER than realtime and gives you automatic speaker labels.
Trade-off: not real-time (transcription happens after the call ends).

Usage:
    # Record during call (saves to WAV file):
    python src/batch_transcriber.py record --session-id abc123

    # After call ends, transcribe the recording:
    python src/batch_transcriber.py transcribe --session-id abc123 --audio-file recordings/abc123.wav
"""

import argparse
import json
import time
import wave
import sys
import os
from pathlib import Path

import pyaudio

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from shared.config import ELEVENLABS_API_KEY, DB_PATH

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "sync-engine" / "src"))
import db_manager

# ─── Audio Recording Config ─────────────────────────────────
SAMPLE_RATE = 16000
CHANNELS = 1
FORMAT = pyaudio.paInt16
CHUNK_SIZE = 4096
RECORDINGS_DIR = Path(__file__).parent.parent / "recordings"


def record_audio(session_id: str):
    """Record microphone audio to a WAV file."""
    RECORDINGS_DIR.mkdir(exist_ok=True)
    output_path = RECORDINGS_DIR / f"{session_id}.wav"

    pa = pyaudio.PyAudio()
    stream = pa.open(format=FORMAT, channels=CHANNELS, rate=SAMPLE_RATE,
                     input=True, frames_per_buffer=CHUNK_SIZE)

    frames = []
    record_start_ms = int(time.time() * 1000)

    print(f"🎙️  Recording for session {session_id}...")
    print(f"   Start time: {record_start_ms} (UTC ms)")
    print(f"   Output: {output_path}")
    print(f"   Press Ctrl+C to stop.\n")

    try:
        while True:
            data = stream.read(CHUNK_SIZE, exception_on_overflow=False)
            frames.append(data)
    except KeyboardInterrupt:
        pass

    stream.stop_stream()
    stream.close()
    pa.terminate()

    # Save WAV file
    with wave.open(str(output_path), "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(pa.get_sample_size(FORMAT))
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))

    record_end_ms = int(time.time() * 1000)
    duration_sec = (record_end_ms - record_start_ms) / 1000

    print(f"\n✅ Recorded {duration_sec:.1f}s to {output_path}")

    # Save timing metadata for timestamp conversion
    meta_path = RECORDINGS_DIR / f"{session_id}.meta.json"
    meta_path.write_text(json.dumps({
        "session_id": session_id,
        "record_start_ms": record_start_ms,
        "record_end_ms": record_end_ms,
    }))


def transcribe_audio(session_id: str, audio_file: str):
    """Send audio file to ElevenLabs batch API and write results to DB."""
    from elevenlabs import ElevenLabsClient

    # Load timing metadata
    meta_path = RECORDINGS_DIR / f"{session_id}.meta.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        record_start_ms = meta["record_start_ms"]
    else:
        print("⚠️  No timing metadata found. Using current time as base.")
        record_start_ms = int(time.time() * 1000)

    print(f"📝 Transcribing {audio_file} for session {session_id}...")

    client = ElevenLabsClient(api_key=ELEVENLABS_API_KEY)

    # Open audio file and send to ElevenLabs
    with open(audio_file, "rb") as f:
        result = client.speech_to_text.convert(
            file=f,
            model_id="scribe_v2",
            tag_audio_events=True,      # Detect laughter, pauses, etc.
            language_code="en",
            diarize=True,               # Speaker separation!
        )

    # Process results
    if hasattr(result, "words") and result.words:
        # Group words into utterances by speaker
        current_speaker = None
        current_words = []
        segment_start = None

        for word in result.words:
            if word.type != "word":
                continue

            speaker = getattr(word, "speaker_id", "unknown") or "unknown"

            if speaker != current_speaker and current_words:
                # Save the previous segment
                _save_segment(
                    session_id, record_start_ms,
                    segment_start, current_words[-1],
                    current_speaker, current_words
                )
                current_words = []
                segment_start = None

            if segment_start is None:
                segment_start = word

            current_speaker = speaker
            current_words.append(word)

        # Save the last segment
        if current_words:
            _save_segment(
                session_id, record_start_ms,
                segment_start, current_words[-1],
                current_speaker, current_words
            )

    print(f"✅ Transcription complete. Segments written to database.")


def _save_segment(session_id, base_ms, first_word, last_word, speaker, words):
    """Save a speaker segment to the database."""
    start_ms = base_ms + int(first_word.start * 1000)
    end_ms = base_ms + int(last_word.end * 1000)
    text = " ".join(w.text for w in words if hasattr(w, "text"))

    # Map ElevenLabs speaker IDs to seller/customer
    # speaker_0 is typically the first person to speak (usually the seller)
    speaker_label = "unknown"
    if speaker == "speaker_0":
        speaker_label = "seller"
    elif speaker == "speaker_1":
        speaker_label = "customer"

    db_manager.insert_transcript_segment(
        session_id=session_id,
        timestamp_start_ms=start_ms,
        timestamp_end_ms=end_ms,
        speaker=speaker_label,
        text=text,
    )
    print(f"  [{(start_ms - base_ms)/1000:6.1f}s] {speaker_label}: {text[:60]}...")


def main():
    parser = argparse.ArgumentParser(description="SalesLens Batch Transcription")
    subparsers = parser.add_subparsers(dest="command")

    rec = subparsers.add_parser("record", help="Record audio from microphone")
    rec.add_argument("--session-id", required=True)

    trans = subparsers.add_parser("transcribe", help="Transcribe a recorded audio file")
    trans.add_argument("--session-id", required=True)
    trans.add_argument("--audio-file", required=True)

    args = parser.parse_args()

    if args.command == "record":
        record_audio(args.session_id)
    elif args.command == "transcribe":
        transcribe_audio(args.session_id, args.audio_file)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
