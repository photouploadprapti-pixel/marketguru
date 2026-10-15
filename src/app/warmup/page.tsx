import { DomainHealth } from '@/components/warmup/domain-health'
import { AccountCard } from '@/components/warmup/account-card'
import { ActivityFeed } from '@/components/warmup/activity-feed'
import { AddAccountDialog } from '@/components/warmup/add-account-dialog'
import { EmptyState } from '@/components/warmup/empty-state'
import { RunNowButton } from '@/components/warmup/run-now-button'
import { StatsOverview } from '@/components/warmup/stats-overview'
import {
  getAccountStats,
  getDashboardStats,
  getLastTickAt,
  getPersistenceStatus,
  listAccounts,
  listActivities,
} from '@/lib/warmup/db'
import { getDailyQuota } from '@/lib/warmup/warmup-schedule'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Mailbox warmup dashboard: stats, accounts, and recent activity.
 */
const WarmupPage = async () => {
  const emptyStats = {
    accountCount: 0,
    warmingCount: 0,
    sentToday: 0,
    inboxPlacement: 100,
    replyRate: 0,
    rescuedToday: 0,
  }

  let accounts: Awaited<ReturnType<typeof listAccounts>> = []
  let stats = emptyStats
  let activities: Awaited<ReturnType<typeof listActivities>> = []
  let lastTickAt: string | null = null
  let persistence: Awaited<ReturnType<typeof getPersistenceStatus>> = {
    backend: 'memory',
    durable: false,
    error: null,
    accountCount: 0,
  }

  try {
    ;[accounts, stats, activities, lastTickAt, persistence] = await Promise.all([
      listAccounts(),
      getDashboardStats(),
      listActivities(12),
      getLastTickAt(),
      getPersistenceStatus(),
    ])
  } catch {
    accounts = []
    stats = emptyStats
    activities = []
  }

  const cards = await Promise.all(
    accounts.map(async (account) => {
      const accountStats = await getAccountStats(account.id)
      return {
        account,
        sentToday: accountStats.sentToday,
        quota: getDailyQuota(account.startedAt, account.dailyLimit),
        daysActive: account.startedAt
          ? Math.max(
            1,
            Math.floor((Date.now() - new Date(account.startedAt).getTime()) / 86400000) + 1,
          )
          : 1,
        inboxPlacement: accountStats.inboxPlacement,
        replyRate: accountStats.replyRate,
      }
    }),
  )

  const emails = Object.fromEntries(accounts.map((account) => [account.id, account.email]))
  const warmingCount = accounts.filter(
    (account) => account.warmupEnabled && account.status === 'warming',
  ).length

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-ember-300 uppercase">Warmup</p>
          <h1 className="mt-2 font-display text-4xl text-parchment-50">Mailboxes</h1>
          <p className="mt-2 max-w-xl text-sm text-parchment-400">
            Add two or more addresses. They send short notes, open what arrives, and pull
            warmup mail out of spam.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RunNowButton />
          <AddAccountDialog />
        </div>
      </div>

      <p className="mb-6 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-parchment-300">
        Storage: {persistence.backend}
        {` · ${persistence.accountCount} saved`}
        {persistence.durable ? ' · durable' : ' · local file'}
        {persistence.error ? ` · ${persistence.error}` : ''}
      </p>

      <StatsOverview stats={stats} />
      <DomainHealth />

      <p className="mt-4 text-sm text-parchment-400">
        {warmingCount >= 2
          ? `Warmup is on for ${warmingCount} mailboxes.`
          : 'Warmup needs two connected mailboxes before it can send.'}
        {lastTickAt
          ? ` Last cycle ${new Date(lastTickAt).toLocaleString()}.`
          : ' No cycle has run yet — use Run now after you add two working inboxes.'}
      </p>

      {accounts.length === 1 ? (
        <p className="mt-4 rounded-2xl border border-ember-400/20 bg-ember-500/10 px-4 py-3 text-sm text-ember-100">
          Add a second working mailbox so warmup can send mail back and forth.
        </p>
      ) : null}

      <section className="mt-8">
        {cards.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {cards.map((card) => (
              <AccountCard key={card.account.id} {...card} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-3xl text-parchment-50">Activity</h2>
        <ActivityFeed items={activities} emails={emails} />
      </section>
    </main>
  )
}

export default WarmupPage
