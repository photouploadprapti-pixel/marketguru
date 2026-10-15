import { CsvCleaner } from '@/components/contacts/csv-cleaner'
import { PageIntro } from '@/components/page-intro'

/**
 * Remove empty and generic addresses from a lead CSV.
 */
const CleanPage = () => (
  <main className="mx-auto max-w-6xl px-6 py-8">
    <PageIntro
      kicker="Clean"
      title="Clean a lead CSV"
      description="Drop blank emails and generic addresses such as admin@domain.com, then download the file or save the remaining rows as contacts."
    />
    <CsvCleaner />
  </main>
)

export default CleanPage
