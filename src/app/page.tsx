import { Flame, Inbox, Kanban, MapPin, Search, Send } from 'lucide-react'

import { ModuleCard } from '@/components/module-card'
import { loadDesk } from '@/lib/desk/store'
import { getDashboardStats, getPersistenceStatus } from '@/lib/warmup/db'

/**
 * Landing page that opens every merged tool from one place.
 */
const HomePage = async () => {
  let mailboxCount = 0
  let warmingCount = 0
  let sentToday = 0
  let leadCount = 0
  let replyCount = 0
  let storage = 'not connected'

  try {
    const [stats, persistence] = await Promise.all([
      getDashboardStats(),
      getPersistenceStatus(),
    ])
    mailboxCount = stats.accountCount
    warmingCount = stats.warmingCount
    sentToday = stats.sentToday
    storage = persistence.durable
      ? `${persistence.backend} · durable`
      : `${persistence.backend} · local file`
  } catch {
    storage = 'unavailable'
  }

  try {
    const desk = await loadDesk()
    leadCount = desk.leads.length
    replyCount = desk.messages.length
  } catch {
    leadCount = 0
    replyCount = 0
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <p className="text-xs tracking-[0.18em] text-ember-300 uppercase">One desk</p>
      <h1 className="mt-2 max-w-xl font-display text-5xl text-parchment-50">
        Find the lead, write them, then warm the inbox.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-parchment-400">
        Place Finder, campaign mail, email discovery, and mailbox warmup now live in the same
        interface. Each tool keeps the workflow it already had.
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-ink-900/70 px-5 py-4">
          <p className="text-xs tracking-[0.14em] text-parchment-500 uppercase">Mailboxes</p>
          <p className="mt-2 font-display text-4xl text-parchment-50">{mailboxCount}</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-ink-900/70 px-5 py-4">
          <p className="text-xs tracking-[0.14em] text-parchment-500 uppercase">Warming</p>
          <p className="mt-2 font-display text-4xl text-parchment-50">{warmingCount}</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-ink-900/70 px-5 py-4">
          <p className="text-xs tracking-[0.14em] text-parchment-500 uppercase">Sent today</p>
          <p className="mt-2 font-display text-4xl text-parchment-50">{sentToday}</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-ink-900/70 px-5 py-4">
          <p className="text-xs tracking-[0.14em] text-parchment-500 uppercase">Pipeline</p>
          <p className="mt-2 font-display text-4xl text-parchment-50">{leadCount}</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-ink-900/70 px-5 py-4">
          <p className="text-xs tracking-[0.14em] text-parchment-500 uppercase">Replies</p>
          <p className="mt-2 font-display text-4xl text-parchment-50">{replyCount}</p>
        </article>
      </section>
      <p className="mt-3 text-xs text-parchment-500">Warmup storage: {storage}</p>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <ModuleCard
          href="/leads"
          title="Place Finder"
          eyebrow="From ShivWeb"
          description="Search cities and place types, scrape a contact email, and download a lead CSV."
          icon={MapPin}
        />
        <ModuleCard
          href="/campaign"
          title="Campaign"
          eyebrow="From ShivWeb"
          description="Send templated HTML from a CSV through your own SMTP, then list bounced rows."
          icon={Send}
        />
        <ModuleCard
          href="/pipeline"
          title="Pipeline"
          eyebrow="Leads"
          description="Move a lead from New to Contacted, Replied, Qualified, and Closed/Won."
          icon={Kanban}
        />
        <ModuleCard
          href="/inbox"
          title="Inbox"
          eyebrow="Unibox"
          description="Read and answer replies from every mailbox, labeled Interested, Not Interested, or Out of Office."
          icon={Inbox}
        />
        <ModuleCard
          href="/finder"
          title="Email Finder"
          eyebrow="From Admin Finder"
          description="Discover a person's address on a domain, send with Gmail, and track delivery."
          icon={Search}
        />
        <ModuleCard
          href="/warmup"
          title="Warmup"
          eyebrow="From Hearth"
          description="Connect mailboxes so they write to each other and climb out of spam."
          icon={Flame}
        />
      </section>
    </main>
  )
}

export default HomePage
