import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Props = {
    name: string
    company: string
    role?: string | null
    currentStreak: number
    totalMeetings: number
}

export function ProfileHeader({ name, company, role, currentStreak, totalMeetings }: Props) {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    return (
        <div
            className="relative overflow-hidden rounded-2xl p-8"
            style={{
                background: 'linear-gradient(135deg, #0D1728 0%, #111C32 60%, #0D1E3A 100%)',
                border: '1px solid rgba(0,102,204,0.2)',
                boxShadow: '0 0 40px rgba(0,102,204,0.1)',
            }}
        >
            {/* Decorative gradient blob */}
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    top: '-60px',
                    right: '-60px',
                    width: '240px',
                    height: '240px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,102,204,0.18) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Back link */}
            <div className="relative z-10 mb-6 flex">
                <Link
                    href="/clients"
                    className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
                    style={{ color: 'var(--muted-foreground)', textDecoration: 'none' }}
                >
                    <ArrowLeft size={15} />
                    All Clients
                </Link>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
                {/* Avatar */}
                <div
                    className="avatar w-20 h-20 text-2xl"
                    style={{ flexShrink: 0 }}
                >
                    {initials}
                </div>

                {/* Name + meta */}
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white leading-tight">{name}</h1>
                    <p className="text-base mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {role ? `${role} — ` : ''}{company}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        {currentStreak > 0 && (
                            <span className="streak-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#F59E0B' }}>
                                    <path d="M13.5 3.5c0 0-1.5 2-1.5 4 0 .83.67 1.5 1.5 1.5S15 8.33 15 7.5C16.19 9.03 17 11 17 13c0 2.76-2.24 5-5 5s-5-2.24-5-5c0-3.47 2.69-5.97 4.5-7.5 0 0 1 1.33 1 2.5 0 0 1-2 1-4.5z" />
                                </svg>
                                {currentStreak} Consecutive Successful {currentStreak === 1 ? 'Meeting' : 'Meetings'}
                            </span>
                        )}
                        <span
                            className="text-sm px-3 py-1 rounded-full font-medium"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--muted-foreground)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            {totalMeetings} {totalMeetings === 1 ? 'Meeting' : 'Meetings'} Total
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
