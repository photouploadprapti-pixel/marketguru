import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { TasksPanel } from '@/components/contacts/tasks-panel'
import { PageIntro } from '@/components/page-intro'
import { isDeskEphemeral, loadDesk } from '@/lib/desk/store'

export const dynamic = 'force-dynamic'

/**
 * Lead pipeline from New through Closed/Won.
 */
const PipelinePage = async () => {
  const desk = await loadDesk()
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <PageIntro
        kicker="Pipeline"
        title="Leads"
        description="Track each lead from New to Contacted, Replied, Qualified, and Closed/Won. Import a Place Finder CSV or add someone by hand."
      />
      <PipelineBoard leads={desk.leads} ephemeral={isDeskEphemeral()} />
      <TasksPanel tasks={desk.tasks} />
    </main>
  )
}

export default PipelinePage
