'use client'

import { actionToggleTask } from '@/actions/action-marketing'
import type { FollowTask } from '@/types/marketing'

type TasksPanelProps = {
  tasks: FollowTask[]
}

/**
 * Call tasks created when a reply is marked Interested.
 * @param props - Open and finished tasks
 */
export const TasksPanel = ({ tasks }: TasksPanelProps) => {
  if (!tasks.length) return null
  return (
    <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5">
      <h2 className="font-display text-2xl text-parchment-50">Interested follow-ups</h2>
      <p className="mt-1 text-sm text-parchment-400">
        These stay on Replied until you move the card to Qualified.
      </p>
      <ul className="mt-4 space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
            <span className={task.done ? 'text-parchment-500 line-through' : 'text-parchment-100'}>
              {task.title}
              <span className="ml-2 text-parchment-500">{task.email}</span>
            </span>
            <button
              type="button"
              onClick={() => actionToggleTask(task.id)}
              className="rounded-full bg-white/10 px-3 py-1 text-xs text-parchment-100"
            >
              {task.done ? 'Reopen' : 'Done'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
