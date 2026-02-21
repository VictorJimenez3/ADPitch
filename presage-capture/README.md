# presage-capture/ — Camera Physiology Capture

**Owner:** Person 1
**Stack:** C++ / SmartSpectra SDK / SQLite
**Presage Docs:** https://docs.physiology.presagetech.com/cpp/index.html

---

## What This Module Does

Reads the external camera using the Presage SmartSpectra C++ SDK and writes physiological metrics to the shared SQLite database every ~1 second.

## How It Connects

```
External Camera
      │
      ▼
┌─────────────────┐
│ presage-capture  │ ← YOU ARE HERE
│                  │
│ SmartSpectra SDK │
│ reads camera,    │
│ extracts metrics │
└────────┬────────┘
         │ Writes to physiology_events table
         ▼
┌─────────────────┐
│   SQLite DB      │ ← sync-engine/data/saleslens.db
│                  │   (Same file that transcription/ writes to)
└─────────────────┘
```

**YOUR OUTPUT:** Rows in the `physiology_events` table with these columns:
- `session_id` — get this from the command line arg or the api-server
- `timestamp_ms` — **UTC milliseconds** (this is how sync works!)
- `heart_rate`, `hrv`, `breathing_rate`, `phasic`, `emotion_score`, `engagement`, `blink_rate`, `is_talking`
- `raw_json` — the full Presage output (for debugging)

## What Presage Gives You

| Metric | DB Column | Sales Meaning |
|--------|-----------|---------------|
| Pulse rate | `heart_rate` | Stress/excitement |
| HRV | `hrv` | Low = stressed, High = relaxed |
| Breathing rate | `breathing_rate` | Anxiety signal |
| Phasic (relative BP) | `phasic` | Emotional arousal over time |
| Emotional responses | `emotion_score` | Map to -1.0 to 1.0 |
| Blink/talk detection | `blink_rate`, `is_talking` | Engagement proxy |

## Setup

```bash
# 1. Install SmartSpectra SDK (Ubuntu 22.04 / Mint 21)
bash scripts/install_sdk.sh

# 2. Build
mkdir build && cd build
cmake .. && make

# 3. Run (pass session_id as arg, or hardcode for testing)
./saleslens_capture --api-key $PRESAGE_API_KEY --session-id abc123
```

## Camera Requirements
- ≥100 pixels across customer's face
- Stable mount (tripod or desk mount, NO handheld shaking)
- ≥60 lux lighting (normal indoor lighting is fine)
- 3-5 feet from subject if mounted
- Point at the CUSTOMER, not the seller

## Key Implementation Notes

1. **Timestamp format:** Use `std::chrono::system_clock::now()` converted to milliseconds since epoch. This MUST be UTC.

2. **SQLite from C++:** Use the sqlite3 C library. It's included in Ubuntu. Link with `-lsqlite3`.

3. **DB path:** The database is at `../sync-engine/data/saleslens.db` relative to this folder. Or read from an env var.

4. **Write frequency:** The SmartSpectra callback fires ~1/second. Write every callback to the DB.

5. **Emotion mapping:** Presage returns emotional responses — you'll need to map these to a -1.0 to 1.0 scale. If the SDK returns discrete categories, map them: very_negative=-1.0, negative=-0.5, neutral=0, positive=0.5, very_positive=1.0.

6. **Engagement:** Derive from a combo of: blink rate (too high = distracted), talk detection (are they responsive?), and head orientation (looking at seller = engaged).

## If C++ Is Difficult

Presage also has a Python client (`pip install presage_technologies`). It works with video files rather than real-time camera, but you can:
1. Record 20-second video chunks with OpenCV
2. Upload each chunk to Presage API
3. Get metrics back and write to DB

```python
from presage_technologies import Physiology
physio = Physiology("your_api_key")

# Upload a video chunk
video_id = physio.queue_processing_hr_rr("/path/to/chunk.mp4")

# Wait, then retrieve
result = physio.retrieve_result(video_id)
```

This is slower but easier to implement for a hackathon.
