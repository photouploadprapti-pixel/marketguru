import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/cn'

type ModuleCardProps = {
  href: string
  title: string
  eyebrow: string
  description: string
  icon: LucideIcon
}

/**
 * Home-page link into one of the merged tools.
 * @param props - Destination, copy, and icon
 */
export const ModuleCard = ({
  href,
  title,
  eyebrow,
  description,
  icon: Icon,
}: ModuleCardProps) => (
  <Link
    href={href}
    className={cn(
      'group rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5 shadow-card',
      'transition hover:border-ember-400/40 hover:bg-ink-800',
    )}
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ember-500/15 text-ember-300">
      <Icon className="h-5 w-5" />
    </span>
    <p className="mt-5 text-xs tracking-[0.16em] text-parchment-500 uppercase">{eyebrow}</p>
    <h2 className="mt-1 font-display text-3xl text-parchment-50 group-hover:text-ember-100">
      {title}
    </h2>
    <p className="mt-2 text-sm leading-6 text-parchment-400">{description}</p>
  </Link>
)
