import type { CampaignReport } from '@/types/marketing'

type ReportsDeskProps = {
  reports: CampaignReport[]
}

/**
 * Counts for each saved campaign send.
 * @param props - Stored reports
 */
export const ReportsDesk = ({ reports }: ReportsDeskProps) => {
  if (!reports.length) {
    return (
      <p className="text-sm text-parchment-400">
        Send a campaign and the counts will land here. Replies update after you refresh Inbox.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <article key={report.id} className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl text-parchment-50">{report.name}</h2>
            <p className="text-xs text-parchment-500">{new Date(report.createdAt).toLocaleString()}</p>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Sent', report.sent],
              ['Failed', report.failed],
              ['Skipped', report.skipped],
              ['Bounced', report.bounced],
              ['Replied', report.repliedEmails.length],
              ['Interested', report.interestedEmails.length],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-xs tracking-[0.14em] text-parchment-500 uppercase">{label}</dt>
                <dd className="mt-1 font-display text-3xl text-parchment-50">{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  )
}
