import { AdminFinderApp } from '@/components/finder/admin-finder-app'
import { PageIntro } from '@/components/page-intro'

/**
 * Domain email discovery, Gmail sending, and delivery status.
 */
const FinderPage = () => (
  <main className="mx-auto max-w-6xl px-6 py-8">
    <PageIntro
      kicker="Finder"
      title="Email Finder"
      description="Look up a person on a domain, send through the Gmail account in your environment, and check which messages bounced."
    />
    <AdminFinderApp />
  </main>
)

export default FinderPage
