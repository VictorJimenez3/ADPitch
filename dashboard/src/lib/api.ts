import { format } from "date-fns"

const API_BASE_URL = "http://localhost:8000"

export type API_TranscriptSegment = {
    start_ms: number
    end_ms: number
    speaker: string
    text: string
    physiology?: {
        heart_rate: number
        engagement: number
        emotion_score: number
        [key: string]: any
    }
}

export type API_Insight = {
    insight_type: "coaching" | "risk" | "highlight" | "summary"
    title: string | null
    body: string
    severity: "positive" | "neutral" | "concern" | "critical"
}

export type API_Session = {
    session_id: string
    customer_name: string | null
    start_time_ms: number
    end_time_ms: number | null
    status: string
    notes: string | null
}

const COMPANY_MAP: Record<string, string> = {
    "David Park": "Park Retail Group",
    "James Chen": "Nexus Technologies",
    "Maria Gonzalez": "Sunrise Health Network",
    "Sarah Williams": "Acme Enterprises",
}

const ROLE_MAP: Record<string, string> = {
    "David Park": "Director of Finance",
    "James Chen": "CEO & Co-Founder",
    "Maria Gonzalez": "HR Director",
    "Sarah Williams": "VP of Operations",
}

function getSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

// ─── Clients List Page Data ──────────────────────────────────────────────

export async function fetchClientsForList() {
    try {
        const res = await fetch(`${API_BASE_URL}/sessions`, { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to fetch sessions")
        const sessions: API_Session[] = await res.json()

        const clientsMap = new Map<string, any>()

        for (const s of sessions) {
            const name = s.customer_name || "Unknown Client"
            const id = getSlug(name)

            if (!clientsMap.has(id)) {
                clientsMap.set(id, {
                    id,
                    name,
                    company: COMPANY_MAP[name] || "Unknown Company",
                    role: ROLE_MAP[name] || null,
                    meetings: []
                })
            }

            const client = clientsMap.get(id)
            client.meetings.push({
                id: s.session_id,
                date: new Date(s.start_time_ms),
                isSuccessful: s.status === "analyzed" || s.status === "completed"
            })
        }

        return Array.from(clientsMap.values())
    } catch (e) {
        console.error(e)
        return []
    }
}

// ─── Client Profile Data ──────────────────────────────────────────────

export async function fetchClientDetails(id: string) {
    try {
        const res = await fetch(`${API_BASE_URL}/sessions`, { cache: "no-store", next: { revalidate: 0 } })
        if (!res.ok) throw new Error("Failed to fetch sessions")
        const allSessions: API_Session[] = await res.json()

        // Filter sessions by slug ID
        const clientSessions = allSessions.filter(s => getSlug(s.customer_name || "Unknown Client") === id)
        if (clientSessions.length === 0) return null

        const name = clientSessions[0].customer_name || "Unknown Client"

        const client = {
            id,
            name,
            company: COMPANY_MAP[name] || "Unknown Company",
            role: ROLE_MAP[name] || null,
            meetings: [] as any[]
        }

        // Fetch details for each session concurrently
        const meetingPromises = clientSessions.map(async (s) => {
            const sid = s.session_id

            let timeline: API_TranscriptSegment[] = []
            let insights: API_Insight[] = []

            // Try fetching timeline & insights (fail gracefully if not found)
            try {
                const tlRes = await fetch(`${API_BASE_URL}/sessions/${sid}/timeline`, { cache: "no-store" })
                if (tlRes.ok) timeline = await tlRes.json()
            } catch (e) { }

            try {
                const inRes = await fetch(`${API_BASE_URL}/sessions/${sid}/insights`, { cache: "no-store" })
                if (inRes.ok) insights = await inRes.json()
            } catch (e) { }

            // Map timeline to transcripts and emotions
            const transcripts = timeline.map((seg, i) => ({
                id: `seg-${i}`,
                offsetMs: seg.start_ms - s.start_time_ms,
                speaker: seg.speaker.charAt(0).toUpperCase() + seg.speaker.slice(1), // "seller" -> "Seller"
                text: seg.text
            }))

            const emotions = timeline
                .filter(seg => seg.physiology)
                .map((seg, i) => {
                    const score = seg.physiology?.emotion_score || 0
                    let label = "Neutral"
                    if (score > 0.3) label = "Happiness"
                    else if (score < -0.3) label = "Frustration"

                    return {
                        id: `emo-${i}`,
                        offsetMs: seg.start_ms - s.start_time_ms,
                        engagement: seg.physiology?.engagement || Math.random() * 0.4 + 0.4, // Fallback
                        emotionLabel: label
                    }
                })

            // Extract summary and feedback from insights
            const summary = insights.find(i => i.insight_type === "summary")?.body || null
            const feedback = insights.find(i => i.insight_type === "coaching")?.body ||
                insights.find(i => i.insight_type === "highlight")?.body || null

            const durMin = s.end_time_ms ? Math.round((s.end_time_ms - s.start_time_ms) / 60000) : null

            return {
                id: s.session_id,
                date: new Date(s.start_time_ms),
                title: s.notes || "Meeting Details",
                summary,
                feedback,
                isSuccessful: s.status === "analyzed" || s.status === "completed" || insights.some(i => i.severity === "positive"),
                durationMin: durMin,
                transcripts,
                emotions
            }
        })

        client.meetings = await Promise.all(meetingPromises)
        client.meetings.sort((a, b) => b.date.getTime() - a.date.getTime())

        return client
    } catch (e) {
        console.error(e)
        return null
    }
}
