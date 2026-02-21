import { fetchClientDetails } from "@/lib/api"
import { notFound } from "next/navigation"
import { ProfileHeader } from "@/components/crm/ProfileHeader"
import { MeetingHistoryList } from "@/components/crm/MeetingHistoryList"

type Props = { params: Promise<{ id: string }> }

function computeStreak(meetings: { isSuccessful: boolean; date: Date | string }[]): number {
    const sorted = [...meetings].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    let streak = 0
    for (const m of sorted) {
        if (m.isSuccessful) streak++
        else break
    }
    return streak
}

export default async function ClientProfilePage({ params }: Props) {
    const { id } = await params

    const client = await fetchClientDetails(id)

    if (!client) return notFound()

    const streak = computeStreak(client.meetings)

    // Aggregate stats across all meetings
    const allEmotions = client.meetings.flatMap((m) => m.emotions)
    const avgEngagement =
        allEmotions.length > 0
            ? Math.round((allEmotions.reduce((s, e) => s + e.engagement, 0) / allEmotions.length) * 100)
            : 0
    const successCount = client.meetings.filter((m) => m.isSuccessful).length
    const successRate =
        client.meetings.length > 0
            ? Math.round((successCount / client.meetings.length) * 100)
            : 0

    // Most frequent emotion (excluding neutral)
    const emotionFreq: Record<string, number> = {}
    for (const e of allEmotions) {
        if (e.emotionLabel !== 'Neutral') {
            emotionFreq[e.emotionLabel] = (emotionFreq[e.emotionLabel] ?? 0) + 1
        }
    }
    const topEmotion =
        Object.entries(emotionFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

    const statCards = [
        {
            label: 'Avg Engagement',
            value: `${avgEngagement}%`,
            color:
                avgEngagement >= 75 ? '#10B981' : avgEngagement >= 50 ? '#F59E0B' : '#EF4444',
        },
        {
            label: 'Meetings Total',
            value: String(client.meetings.length),
            color: '#1E80E8',
        },
        {
            label: 'Success Rate',
            value: `${successRate}%`,
            color:
                successRate >= 60 ? '#10B981' : successRate >= 40 ? '#F59E0B' : '#EF4444',
        },
        {
            label: 'Peak Emotion',
            value: topEmotion,
            color: '#8B5CF6',
            small: true,
        },
    ]

    return (
        <div className="page-enter max-w-5xl mx-auto px-6 py-8 flex flex-col gap-7">
            {/* Profile Header */}
            <ProfileHeader
                name={client.name}
                company={client.company}
                role={client.role}
                currentStreak={streak}
                totalMeetings={client.meetings.length}
            />

            {/* Stat Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <div key={card.label} className="stat-card">
                        <span className="stat-label">{card.label}</span>
                        <span
                            className={`stat-value${card.small ? ' text-xl' : ''}`}
                            style={{ color: card.color }}
                        >
                            {card.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Meetings History + expandable detail */}
            {client.meetings.length > 0 ? (
                <MeetingHistoryList meetings={client.meetings} />
            ) : (
                <div
                    className="flex items-center justify-center h-40 rounded-xl text-sm"
                    style={{
                        color: 'var(--muted-foreground)',
                        background: 'var(--adp-navy-card)',
                        border: '1px solid var(--adp-navy-border)',
                    }}
                >
                    No meetings recorded with this client yet.
                </div>
            )}
        </div>
    )
}
