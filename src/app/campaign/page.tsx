import { CampaignDesk } from '@/components/leads/campaign-desk'
import { loadDesk } from '@/lib/desk/store'

export const dynamic = 'force-dynamic'

/**
 * CSV campaign sender and bounce list.
 */
const CampaignPage = async () => {
  const desk = await loadDesk()
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <CampaignDesk
        templates={desk.templates}
        lists={desk.lists}
        contacts={desk.contacts}
      />
    </main>
  )
}

export default CampaignPage
