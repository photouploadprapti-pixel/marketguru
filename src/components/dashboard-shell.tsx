'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Eraser,
  Flame,
  Inbox,
  Kanban,
  LayoutDashboard,
  ListTree,
  MapPin,
  Search,
  Send,
  Users,
} from 'lucide-react'

import { cn } from '@/lib/cn'

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/leads', label: 'Place Finder', icon: MapPin },
  { href: '/finder', label: 'Email Finder', icon: Search },
  { href: '/clean', label: 'Clean CSV', icon: Eraser },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/campaign', label: 'Campaign', icon: Send },
  { href: '/sequences', label: 'Sequences', icon: ListTree },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/warmup', label: 'Warmup', icon: Flame },
]

type DashboardShellProps = {
  children: React.ReactNode
}

/**
 * Whether a nav item matches the current route.
 * @param href - Nav destination
 * @param pathname - Current path
 */
const isActive = (href: string, pathname: string): boolean => {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Shared sidebar for Places, Campaign, Finder, and Warmup.
 * @param props - Page content
 */
export const DashboardShell = ({ children }: DashboardShellProps) => {
  const pathname = usePathname()

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/10 bg-ink-950/80 lg:max-h-screen lg:min-h-screen lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ember-500 text-sm font-semibold text-ink-950">
            MG
          </span>
          <span>
            <span className="block font-display text-2xl leading-none text-parchment-50">
              MarketGuru
            </span>
            <span className="mt-1 block text-[11px] tracking-[0.16em] text-parchment-500 uppercase">
              Outreach desk
            </span>
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-6">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm',
                  active
                    ? 'bg-ember-500 text-ink-950'
                    : 'text-parchment-300 hover:bg-white/5 hover:text-parchment-50',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
