import { InboxDesk } from '@/components/inbox/inbox-desk'
import { PageIntro } from '@/components/page-intro'
import { isDeskEphemeral, loadDesk } from '@/lib/desk/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Unified inbox for replies across connected mailboxes.
 */
const InboxPage = async () => {
  const desk = await loadDesk()
  const messages = [...desk.messages].sort((left, right) =>
    right.receivedAt.localeCompare(left.receivedAt),
  )
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <PageIntro
        kicker="Unibox"
        title="Inbox"
        description="Read and answer replies from every mailbox in Warmup. Warmup notes between your own addresses stay out of this list."
      />
      <InboxDesk
        messages={messages}
        ephemeral={isDeskEphemeral()}
        modelEnabled={Boolean(process.env.OPENAI_API_KEY)}
      />
    </main>
  )
}

export default InboxPage
