/**
 * dashboard/src/api/client.js — API client for the SalesLens backend.
 *
 * All API calls go through here. Person 4: import these functions
 * in your components instead of writing fetch() calls directly.
 */

const API_BASE = "http://localhost:8000";

// ─── Sessions ──────────────────────────────────────────────

export async function createSession(customerName, notes) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer_name: customerName, notes }),
  });
  return res.json(); // { session_id, message }
}

export async function listSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  return res.json(); // [{ session_id, customer_name, status, ... }]
}

export async function getSession(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  return res.json();
}

export async function stopSession(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/stop`, {
    method: "POST",
  });
  return res.json(); // { status, score }
}

// ─── Data ──────────────────────────────────────────────────

export async function getTimeline(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/timeline`);
  return res.json();
  // Returns: [{ start_ms, end_ms, speaker, text, physiology: { heart_rate, hrv, ... } }]
}

export async function getInsights(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/insights`);
  return res.json();
  // Returns: [{ insight_type, title, body, severity, timestamp_ref_ms }]
}

export async function getPhysiology(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/physiology`);
  return res.json();
  // Returns: [{ timestamp_ms, heart_rate, hrv, breathing_rate, emotion_score, engagement }]
}

export async function getTranscript(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/transcript`);
  return res.json();
}
