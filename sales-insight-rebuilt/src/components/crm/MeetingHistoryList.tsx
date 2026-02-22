"use client"
import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TranscriptViewer } from './TranscriptViewer'
import { StatsCharts } from './StatsCharts'

type TranscriptSegment = {
    id: string
    offsetMs: number
    speaker: string
    text: string
}
type EmotionSnapshot = {
    id: string
    offsetMs: number
    engagement: number
    emotionLabel: string
}
type Meeting = {
    id: string
    date: Date | string
    title?: string | null
    summary?: string | null
    feedback?: string | null
    isSuccessful: boolean
    durationMin?: number | null
    transcripts: TranscriptSegment[]
    emotions: EmotionSnapshot[]
}

type Props = {
    meetings: Meeting[]
}

export function MeetingHistoryList({ meetings }: Props) {
    const [openId, setOpenId] = useState<string | null>(meetings[0]?.id ?? null)

    const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id))

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold text-white">Meeting History</h2>
                <span
                    className="text-xs font-medium px-2 py-1 rounded-md"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)' }}
                >
                    {meetings.length} meetings
                </span>
            </div>

            {meetings.map((meeting) => {
                const isOpen = openId === meeting.id
                const dateStr = format(new Date(meeting.date), 'MMM d, yyyy')

                return (
                    <div key={meeting.id} className={`meeting-row ${isOpen ? 'is-open' : ''}`}>
                        {/* Row header */}
                        <div
                            className="meeting-row-header"
                            onClick={() => toggle(meeting.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && toggle(meeting.id)}
                            aria-expanded={isOpen}
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                {/* Status dot */}
                                <span
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: meeting.isSuccessful ? '#10B981' : '#EF4444',
                                        flexShrink: 0,
                                        boxShadow: meeting.isSuccessful
                                            ? '0 0 6px rgba(16,185,129,0.5)'
                                            : '0 0 6px rgba(239,68,68,0.5)',
                                    }}
                                />

                                <div className="min-w-0">
                                    {/* Date — the clickable anchor */}
                                    <p className="text-sm font-semibold" style={{ color: '#1E80E8' }}>
                                        {dateStr}
                                    </p>
                                    {meeting.title && (
                                        <p
                                            className="text-xs truncate mt-0.5"
                                            style={{ color: 'var(--muted-foreground)' }}
                                        >
                                            {meeting.title}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                {meeting.durationMin != null && (
                                    <span
                                        className="text-xs hidden sm:block"
                                        style={{ color: 'var(--muted-foreground)' }}
                                    >
                                        {meeting.durationMin} min
                                    </span>
                                )}
                                <span className={meeting.isSuccessful ? 'badge-success' : 'badge-fail'}>
                                    {meeting.isSuccessful ? 'Successful' : 'Needs Re-engagement'}
                                </span>
                                {isOpen ? (
                                    <ChevronUp size={16} style={{ color: 'var(--muted-foreground)' }} />
                                ) : (
                                    <ChevronDown size={16} style={{ color: 'var(--muted-foreground)' }} />
                                )}
                            </div>
                        </div>

                        {/* Expanded content */}
                        {isOpen && (
                            <div
                                className="px-5 pb-6 pt-2 flex flex-col gap-5"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                {/* AI Summary */}
                                {meeting.summary && (
                                    <div
                                        className="rounded-xl p-4"
                                        style={{
                                            background: 'rgba(0,102,204,0.07)',
                                            border: '1px solid rgba(0,102,204,0.18)',
                                        }}
                                    >
                                        <p
                                            className="text-xs font-semibold uppercase tracking-wider mb-2"
                                            style={{ color: '#1E80E8' }}
                                        >
                                            AI Summary
                                        </p>
                                        <p className="text-sm leading-relaxed" style={{ color: '#C5D8F0' }}>
                                            {meeting.summary}
                                        </p>
                                    </div>
                                )}

                                {/* Seller Feedback */}
                                {meeting.feedback && (
                                    <div
                                        className="rounded-xl p-4"
                                        style={{
                                            background: 'rgba(245,158,11,0.07)',
                                            border: '1px solid rgba(245,158,11,0.18)',
                                        }}
                                    >
                                        <p
                                            className="text-xs font-semibold uppercase tracking-wider mb-2"
                                            style={{ color: '#F59E0B' }}
                                        >
                                            Coach Feedback
                                        </p>
                                        <p className="text-sm leading-relaxed" style={{ color: '#E5ECF6' }}>
                                            {meeting.feedback}
                                        </p>
                                    </div>
                                )}

                                {/* Charts */}
                                <StatsCharts emotions={meeting.emotions} />

                                {/* Transcript */}
                                <TranscriptViewer
                                    transcripts={meeting.transcripts}
                                    emotions={meeting.emotions}
                                />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
