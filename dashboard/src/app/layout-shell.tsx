"use client"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Activity, BarChart2 } from "lucide-react"

const navItems = [
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/analytics", label: "Analytics", icon: Activity },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--adp-black)" }}>
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col w-64 flex-shrink-0"
        style={{
          background: "var(--sidebar)",
          borderRight: "1px solid var(--adp-border)",
        }}
      >
        {/* Red accent rule at very top */}
        <div className="red-rule" />

        {/* Brand */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--adp-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center font-black text-white text-xs tracking-tight"
              style={{ background: "var(--adp-red)", letterSpacing: "-0.03em" }}
            >
              ADP
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide leading-tight">Sales Insight</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--adp-text-muted)" }}>
                Conversation Intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="px-2 pb-2 text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--adp-text-subtle)" }}>
            Menu
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={`nav-link ${isActive ? "active" : ""}`}>
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--adp-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: "var(--adp-red)" }}
            >
              S
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">Sales Rep</div>
              <div className="text-xs truncate" style={{ color: "var(--adp-text-muted)" }}>
                ADP Account Executive
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right column: top header + page content ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header bar with ADP logo top-right */}
        <header className="top-header">
          <Image
            src="/adp-logo.svg"
            alt="ADP"
            width={72}
            height={36}
            priority
            style={{ objectFit: "contain" }}
          />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
