import { ReportsDesk } from '@/components/contacts/reports-desk'
import { PageIntro } from '@/components/page-intro'
import { loadDesk } from '@/lib/desk/store'

export const dynamic = 'force-dynamic'

/**
 * Sent, bounced, replied, and interested counts for each campaign.
 */
const ReportsPage = async () => {
  const desk = await loadDesk()
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <PageIntro
        kicker="Reports"
        title="What a send actually did"
        description="Each campaign keeps how many were sent, skipped, bounced, replied, and marked Interested. Refresh Inbox to update replies."
      />
      <ReportsDesk reports={desk.reports} />
    </main>
  )
}

export default ReportsPage
