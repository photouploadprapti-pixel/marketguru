import { SequencesDesk } from '@/components/contacts/sequences-desk'
import { PageIntro } from '@/components/page-intro'
import { loadDesk } from '@/lib/desk/store'
import { listAccounts } from '@/lib/warmup/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Templates and follow-up sequences for a saved list.
 */
const SequencesPage = async () => {
  const desk = await loadDesk()
  let accounts: { id: string; email: string }[] = []
  try {
    const saved = await listAccounts()
    accounts = saved.map((account) => ({ id: account.id, email: account.email }))
  } catch {
    accounts = []
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <PageIntro
        kicker="Sequences"
        title="Follow up if they stay quiet"
        description="Save a template with {Name} and {City}. A sequence sends the first note, waits, then sends a shorter follow-up only if nobody replied and the address did not bounce."
      />
      <SequencesDesk
        templates={desk.templates}
        lists={desk.lists}
        sequences={desk.sequences}
        enrollments={desk.enrollments}
        accounts={accounts}
      />
    </main>
  )
}

export default SequencesPage
