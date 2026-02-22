"use client"

type TranscriptSegment = {
    id: string
    offsetMs: number
    speaker: string
    text: string
}
type EmotionSnapshot = {
    offsetMs: number
    engagement: number
    emotionLabel: string
}

const EMOTION_COLORS: Record<string, string> = {
    Happiness: '#10B981',
    Interest: '#0066CC',
    Curiosity: '#1E80E8',
    Relief: '#34D399',
    Focus: '#6366F1',
    Neutral: '#6B84A6',
    Concern: '#F59E0B',
    Hesitation: '#F97316',
    Skepticism: '#EF4444',
    Frustration: '#DC2626',
    Confusion: '#EF4444',
}

function getEmotionDim(label: string): string {
    const map: Record<string, string> = {
        Happiness: 'rgba(16,185,129,0.12)',
        Interest: 'rgba(0,102,204,0.12)',
        Curiosity: 'rgba(30,128,232,0.12)',
        Relief: 'rgba(52,211,153,0.12)',
        Focus: 'rgba(99,102,241,0.12)',
        Neutral: 'rgba(107,132,166,0.10)',
        Concern: 'rgba(245,158,11,0.12)',
        Hesitation: 'rgba(249,115,22,0.12)',
        Skepticism: 'rgba(239,68,68,0.12)',
        Frustration: 'rgba(220,38,38,0.12)',
        Confusion: 'rgba(239,68,68,0.12)',
    }
    return map[label] ?? 'rgba(107,132,166,0.10)'
}

type Props = {
    transcripts: TranscriptSegment[]
    emotions: EmotionSnapshot[]
}

export function TranscriptViewer({ transcripts, emotions }: Props) {
    const findEmotion = (offsetMs: number) =>
        emotions.find((e) => Math.abs(e.offsetMs - offsetMs) <= 2500)

    if (transcripts.length === 0) {
        return (
            <div
                className="flex items-center justify-center h-32 rounded-xl text-sm"
                style={{ color: 'var(--muted-foreground)', background: 'var(--adp-navy-card)', border: '1px solid var(--adp-navy-border)' }}
            >
                No transcript available for this meeting.
            </div>
        )
    }

    return (
        <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--adp-navy-border)', background: 'var(--adp-navy)' }}
        >
            {/* Header */}
            <div
                className="px-5 py-3 flex items-center justify-between border-b"
                style={{ borderColor: 'var(--adp-navy-border)', background: 'var(--adp-navy-card)' }}
            >
                <span className="text-sm font-semibold text-white">Full Transcript</span>
                <span
                    className="text-xs px-2 py-1 rounded-md font-medium"
                    style={{ background: 'rgba(0,102,204,0.12)', color: '#1E80E8' }}
                >
                    {transcripts.length} messages
                </span>
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-4 p-5 max-h-[520px] overflow-y-auto">
                {transcripts.map((seg, idx) => {
                    const isSeller = seg.speaker.toLowerCase() === 'seller'
                    const emotion = !isSeller ? findEmotion(seg.offsetMs) : undefined

                    return (
                        <div
                            key={seg.id ?? idx}
                            className="flex flex-col"
                            style={{ alignItems: isSeller ? 'flex-end' : 'flex-start' }}
                        >
                            {/* Meta label */}
                            <span
                                className="text-xs mb-1 font-medium"
                                style={{ color: 'var(--muted-foreground)' }}
                            >
                                {seg.speaker} &middot; {Math.round(seg.offsetMs / 1000)}s
                            </span>

                            {/* Bubble */}
                            <div
                                className="max-w-[75%] px-4 py-3 text-sm leading-relaxed"
                                style={
                                    isSeller
                                        ? {
                                            background: 'linear-gradient(135deg, #0052A3, #0066CC)',
                                            color: '#fff',
                                            borderRadius: '18px 18px 4px 18px',
                                            boxShadow: '0 2px 12px rgba(0,102,204,0.25)',
                                        }
                                        : {
                                            background: '#1A2540',
                                            color: '#C5D8F0',
                                            border: '1px solid rgba(255,255,255,0.07)',
                                            borderRadius: '18px 18px 18px 4px',
                                        }
                                }
                            >
                                {seg.text}
                            </div>

                            {/* Emotion tag */}
                            {emotion && emotion.emotionLabel !== 'Neutral' && (
                                <div
                                    className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                                    style={{
                                        background: getEmotionDim(emotion.emotionLabel),
                                        color: EMOTION_COLORS[emotion.emotionLabel] ?? '#6B84A6',
                                        border: `1px solid ${EMOTION_COLORS[emotion.emotionLabel] ?? '#6B84A6'}33`,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: EMOTION_COLORS[emotion.emotionLabel] ?? '#6B84A6',
                                            display: 'inline-block',
                                            flexShrink: 0,
                                        }}
                                    />
                                    Client showed {emotion.emotionLabel.toLowerCase()} ({Math.round(emotion.engagement * 100)}% engagement)
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
