import { fetchClientsForList } from "@/lib/api"
import { ClientList } from "@/components/crm/ClientList"

export default async function ClientsPage() {
    const clients = await fetchClientsForList()

    const totalMeetings = clients.reduce((sum, c) => sum + c.meetings.length, 0)
    const totalSuccessful = clients.reduce(
        (sum, c) => sum + c.meetings.filter((m: any) => m.isSuccessful).length,
        0
    )
    const overallRate = totalMeetings > 0 ? Math.round((totalSuccessful / totalMeetings) * 100) : 0

    return (
        <div className="page-enter">
            {/* Page header */}
            <div
                className="px-8 py-7 border-b"
                style={{ borderColor: 'var(--adp-navy-border)', background: 'var(--adp-navy-mid)' }}
            >
                <h1 className="text-2xl font-bold text-white">My Clients</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Track every relationship, every conversation, every insight.
                </p>

                {/* Summary strip */}
                <div className="flex flex-wrap gap-6 mt-5">
                    <div>
                        <p className="text-2xl font-bold text-white">{clients.length}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Active Clients</p>
                    </div>
                    <div
                        style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }}
                    />
                    <div>
                        <p className="text-2xl font-bold text-white">{totalMeetings}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Total Meetings</p>
                    </div>
                    <div
                        style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }}
                    />
                    <div>
                        <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{overallRate}%</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Overall Success Rate</p>
                    </div>
                </div>
            </div>

            {/* Client grid */}
            <div className="px-8 py-6">
                <ClientList clients={clients} />
            </div>
        </div>
    )
}
