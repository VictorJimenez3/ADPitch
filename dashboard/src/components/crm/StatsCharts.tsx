"use client"
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, CartesianGrid
} from 'recharts'

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

function getEmotionColor(label: string) {
    return EMOTION_COLORS[label] ?? '#6B84A6'
}

type Props = {
    emotions: EmotionSnapshot[]
}

export function StatsCharts({ emotions }: Props) {
    const lineData = emotions.map((e) => ({
        time: `${Math.round(e.offsetMs / 1000)}s`,
        engagement: Math.round(e.engagement * 100),
        emotion: e.emotionLabel,
        color: getEmotionColor(e.emotionLabel),
    }))

    // Emotion frequency distribution
    const emotionCounts: Record<string, number> = {}
    for (const e of emotions) {
        emotionCounts[e.emotionLabel] = (emotionCounts[e.emotionLabel] ?? 0) + 1
    }
    const barData = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({
            label,
            count,
            color: getEmotionColor(label),
        }))

    const CustomDot = (props: any) => {
        const { cx, cy, payload } = props
        return (
            <circle
                cx={cx} cy={cy} r={5}
                fill={payload.color}
                stroke="#0D1728"
                strokeWidth={2}
            />
        )
    }

    const CustomTooltipLine = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null
        return (
            <div
                className="px-3 py-2 text-sm rounded-xl"
                style={{
                    background: '#111C32',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
            >
                <p className="font-semibold text-white">{payload[0].payload.time}</p>
                <p style={{ color: '#34D399' }}>Engagement: {payload[0].value}%</p>
                <p style={{ color: getEmotionColor(payload[0].payload.emotion) }}>
                    {payload[0].payload.emotion}
                </p>
            </div>
        )
    }

    const CustomTooltipBar = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null
        return (
            <div
                className="px-3 py-2 text-sm rounded-xl"
                style={{
                    background: '#111C32',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
            >
                <p className="font-semibold text-white">{payload[0].payload.label}</p>
                <p style={{ color: payload[0].payload.color }}>{payload[0].value} occurrences</p>
            </div>
        )
    }

    const axisStyle = { fill: '#6B84A6', fontSize: 11, fontFamily: 'inherit' }

    if (emotions.length === 0) {
        return (
            <div
                className="flex items-center justify-center h-40 rounded-xl text-sm"
                style={{ color: 'var(--muted-foreground)', background: 'var(--adp-navy-card)', border: '1px solid var(--adp-navy-border)' }}
            >
                No emotion data for this meeting.
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 chart-reveal">
            {/* Engagement Line Chart */}
            <div
                className="glass-card p-5"
                style={{ padding: '1.25rem' }}
            >
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white">Client Engagement</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Engagement % over time during this meeting</p>
                </div>
                <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                            <Tooltip content={<CustomTooltipLine />} />
                            <Line
                                type="monotone"
                                dataKey="engagement"
                                stroke="#0066CC"
                                strokeWidth={2.5}
                                dot={<CustomDot />}
                                activeDot={{ r: 7, stroke: '#0066CC', strokeWidth: 2, fill: '#fff' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Emotion Distribution Bar Chart */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white">Emotion Breakdown</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Frequency of each detected emotion</p>
                </div>
                <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barSize={22}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="label" tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltipBar />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {barData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
