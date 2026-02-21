# dashboard/ + api-server/ — Web Dashboard & REST API

**Owner:** Person 4
**Stack:** React / Tailwind CSS / Recharts + Python / FastAPI
**API Base URL:** `http://localhost:8000`

---

## What This Module Does

A web dashboard where sellers can:
1. Start/stop recording sessions
2. View the conversation timeline with an emotion heatmap overlay
3. Read AI coaching insights
4. See engagement charts over time
5. Browse past conversation history

## How It Connects

```
┌─────────────────┐        REST API         ┌─────────────────┐
│   dashboard/     │ ◄─────────────────────► │  api-server/     │
│                  │  GET /sessions           │                  │
│   React app      │  GET /sessions/id/       │  FastAPI          │
│   (localhost:5173)│     timeline            │  (localhost:8000) │
│                  │  GET /sessions/id/       │                  │
│                  │     insights             │  Reads from       │
│                  │  POST /sessions          │  SQLite DB        │
│                  │  POST /sessions/id/stop  │                  │
└─────────────────┘                          └─────────────────┘
```

## API Endpoints (Your Data Source)

| Method | Endpoint | Returns | When to Call |
|--------|----------|---------|-------------|
| `POST /sessions` | `{session_id, message}` | User clicks "Start Session" |
| `GET /sessions` | `[{session_id, customer_name, status, ...}]` | Session list page |
| `GET /sessions/{id}` | `{session_id, status, start_time_ms, ...}` | Session detail page |
| `POST /sessions/{id}/stop` | `{status, score}` | User clicks "Stop & Analyze" |
| `GET /sessions/{id}/timeline` | `[{text, speaker, physiology, start_ms, end_ms}]` | Timeline view |
| `GET /sessions/{id}/insights` | `[{insight_type, title, body, severity}]` | Insights panel |
| `GET /sessions/{id}/physiology` | `[{timestamp_ms, heart_rate, hrv, ...}]` | Charts |

## Key Components to Build

### 1. SessionList — Main page
- Fetch `GET /sessions`
- Show cards with customer name, status badge, score
- Click → navigate to session detail

### 2. NewSession — Start recording
- Form: customer name, notes
- POST to `/sessions`
- Display the session_id so capture modules can be started

### 3. Timeline — The core view
- Fetch `GET /sessions/{id}/timeline`
- Each entry: speaker label, text, timestamp
- Color-code by emotion_score (red = negative, green = positive)
- Show HR/engagement sparkline alongside each segment

### 4. InsightCard — AI coaching
- Fetch `GET /sessions/{id}/insights`
- Card per insight with severity color (green/yellow/red)
- Types: summary, coaching, risk, highlight

### 5. EngagementChart — Physiology over time
- Fetch `GET /sessions/{id}/physiology`
- Recharts line graph: HR, engagement, emotion over time
- Highlight moments flagged by AI insights

## Setup

```bash
cd dashboard
npm install
npm run dev    # Opens at http://localhost:5173
```

Make sure the API server is running at `http://localhost:8000`.

## Example Timeline Response (what you'll render)

```json
[
  {
    "start_ms": 1708534891500,
    "end_ms": 1708534896000,
    "speaker": "customer",
    "text": "The pricing seems really high for what we get",
    "physiology": {
      "heart_rate": 81.2,
      "hrv": 35.4,
      "breathing_rate": 18.1,
      "phasic": 0.72,
      "emotion_score": -0.4,
      "engagement": 0.62
    }
  },
  {
    "start_ms": 1708534896000,
    "end_ms": 1708534901000,
    "speaker": "seller",
    "text": "I understand that concern. Let me show you the ROI breakdown",
    "physiology": {
      "heart_rate": 76.8,
      "hrv": 41.2,
      "breathing_rate": 15.3,
      "phasic": 0.55,
      "emotion_score": 0.1,
      "engagement": 0.71
    }
  }
]
```

## Design Notes

- Color palette: Use red→yellow→green for emotion scores
- Keep it clean — sellers need to scan results quickly
- Mobile-friendly is a plus for reviewing between meetings
- The timeline is the hero component — make it great
