"use client"
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'

type Meeting = {
    id: string
    date: Date | string
    isSuccessful: boolean
}

type Client = {
    id: string
    name: string
    company: string
    role?: string | null
    meetings: Meeting[]
}

function getStreak(meetings: Meeting[]): number {
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

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #0066CC, #1E80E8)',
    'linear-gradient(135deg, #6366F1, #8B5CF6)',
    'linear-gradient(135deg, #0891B2, #06B6D4)',
    'linear-gradient(135deg, #059669, #10B981)',
]

export function ClientList({ clients }: { clients: Client[] }) {
    if (clients.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center py-20 rounded-2xl"
                style={{ background: 'var(--adp-navy-card)', border: '1px solid var(--adp-navy-border)' }}
            >
                <p className="text-lg font-semibold text-white">No clients yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Start by recording a meeting.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client, i) => {
                const streak = getStreak(client.meetings)
                const successCount = client.meetings.filter((m) => m.isSuccessful).length
                const successRate =
                    client.meetings.length > 0
                        ? Math.round((successCount / client.meetings.length) * 100)
                        : 0
                const lastMeeting =
                    client.meetings.length > 0
                        ? [...client.meetings].sort(
                            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                        )[0]
                        : null
                const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]

                return (
                    <Link
                        key={client.id}
                        href={`/clients/${client.id}`}
                        style={{ textDecoration: 'none' }}
                    >
                        <div
                            className="glass-card glass-card-lift flex flex-col gap-4 p-5 cursor-pointer h-full"
                            style={{ minHeight: 180 }}
                        >
                            {/* Top row: avatar + streak */}
                            <div className="flex items-start justify-between">
                                <div className="avatar w-11 h-11 text-sm" style={{ background: gradient }}>
                                    {getInitials(client.name)}
                                </div>
                                {streak > 0 && (
                                    <span className="streak-badge" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#F59E0B' }}>
                                            <path d="M13.5 3.5c0 0-1.5 2-1.5 4 0 .83.67 1.5 1.5 1.5S15 8.33 15 7.5C16.19 9.03 17 11 17 13c0 2.76-2.24 5-5 5s-5-2.24-5-5c0-3.47 2.69-5.97 4.5-7.5 0 0 1 1.33 1 2.5 0 0 1-2 1-4.5z" />
                                        </svg>
                                        {streak} Streak
                                    </span>
                                )}
                            </div>

                            {/* Name + company */}
                            <div className="flex-1">
                                <p className="text-base font-bold text-white leading-tight">{client.name}</p>
                                {client.role && (
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                                        {client.role}
                                    </p>
                                )}
                                <p className="text-sm mt-0.5" style={{ color: '#A4B8D5' }}>
                                    {client.company}
                                </p>
                            </div>

                            {/* Stats row */}
                            <div
                                className="flex items-center justify-between pt-3"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <div className="flex gap-4">
                                    <div>
                                        <p className="text-lg font-bold text-white leading-none">{client.meetings.length}</p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Meetings</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white leading-none">{successRate}%</p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Success</p>
                                    </div>
                                    {lastMeeting && (
                                        <div>
                                            <p className="text-sm font-semibold text-white leading-tight">
                                                {format(new Date(lastMeeting.date), 'MMM d')}
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Last met</p>
                                        </div>
                                    )}
                                </div>
                                <ArrowRight size={16} style={{ color: '#1E80E8' }} />
                            </div>
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
