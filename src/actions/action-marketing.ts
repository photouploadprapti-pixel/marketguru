'use server'

import { revalidatePath } from 'next/cache'

import { createId } from '@/lib/cn'
import { updateDesk } from '@/lib/desk/store'
import { isUsableEmail } from '@/lib/leads/usable-email'
import { runDueSequences } from '@/lib/marketing/sequence-runner'
import type { SequenceStep } from '@/types/marketing'

export type MarketingActionResult = {
  ok: boolean
  message: string
}

/**
 * Refresh pages that show templates, sequences, reports, and tasks.
 */
const refresh = () => {
  revalidatePath('/sequences')
  revalidatePath('/reports')
  revalidatePath('/campaign')
  revalidatePath('/pipeline')
  revalidatePath('/')
}

/**
 * Save a subject and body that can use {Name} and {City}.
 * @param input - Template fields
 */
export const actionSaveTemplate = async (input: {
  name: string
  subject: string
  body: string
}): Promise<MarketingActionResult> => {
  const name = input.name.trim()
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!name || !subject || !body) {
    return { ok: false, message: 'Name, subject, and body are required.' }
  }
  await updateDesk((state) => {
    state.templates.unshift({
      id: createId(8),
      name: name.slice(0, 80),
      subject: subject.slice(0, 180),
      body,
      createdAt: new Date().toISOString(),
    })
  })
  refresh()
  return { ok: true, message: 'Template saved.' }
}

/**
 * Delete a saved template.
 * @param id - Template id
 */
export const actionDeleteTemplate = async (id: string): Promise<MarketingActionResult> => {
  await updateDesk((state) => {
    state.templates = state.templates.filter((item) => item.id !== id)
  })
  refresh()
  return { ok: true, message: 'Template removed.' }
}

/**
 * Create a sequence and enroll every usable contact on the chosen list.
 * @param input - Sequence name, list, mailbox, and steps
 */
export const actionCreateSequence = async (input: {
  name: string
  listId: string
  accountId: string
  steps: SequenceStep[]
}): Promise<MarketingActionResult> => {
  const name = input.name.trim()
  const steps = input.steps
    .map((step) => ({
      delayDays: Math.max(0, Math.min(60, Math.round(step.delayDays))),
      subject: step.subject.trim(),
      body: step.body.trim(),
    }))
    .filter((step) => step.subject && step.body)
    .slice(0, 4)
  if (!name || !input.listId || !input.accountId || !steps.length) {
    return { ok: false, message: 'Name, list, mailbox, and at least one step are required.' }
  }

  let enrolled = 0
  await updateDesk((state) => {
    const sequenceId = createId(8)
    const now = Date.now()
    state.sequences.unshift({
      id: sequenceId,
      name: name.slice(0, 80),
      listId: input.listId,
      accountId: input.accountId,
      steps,
      createdAt: new Date(now).toISOString(),
    })
    const blocked = new Set(state.suppressions.map((item) => item.email))
    for (const contact of state.contacts) {
      if (!contact.listIds.includes(input.listId)) continue
      if (!isUsableEmail(contact.email) || blocked.has(contact.email)) continue
      const first = steps[0]
      state.enrollments.unshift({
        id: createId(8),
        sequenceId,
        contactId: contact.id,
        email: contact.email,
        step: 0,
        nextAt: new Date(now + (first?.delayDays ?? 0) * 86400000).toISOString(),
        status: 'active',
      })
      enrolled += 1
    }
  })
  refresh()
  return {
    ok: true,
    message: enrolled
      ? `Sequence saved with ${enrolled} contact${enrolled === 1 ? '' : 's'}.`
      : 'Sequence saved, but that list has no mailable contacts.',
  }
}

/**
 * Send follow-up steps whose wait has elapsed.
 */
export const actionRunSequences = async (): Promise<MarketingActionResult> => {
  const message = await runDueSequences()
  refresh()
  return { ok: true, message }
}

/**
 * Store the outcome of one campaign send.
 * @param input - Counts and the addresses that were attempted
 */
export const actionSaveCampaignReport = async (input: {
  name: string
  sent: number
  failed: number
  skipped: number
  recipients: string[]
}): Promise<MarketingActionResult> => {
  await updateDesk((state) => {
    state.reports.unshift({
      id: createId(8),
      name: input.name.trim().slice(0, 80) || 'Campaign',
      sent: input.sent,
      failed: input.failed,
      skipped: input.skipped,
      bounced: 0,
      recipients: [...new Set(input.recipients.map((email) => email.toLowerCase()))],
      repliedEmails: [],
      interestedEmails: [],
      bouncedEmails: [],
      createdAt: new Date().toISOString(),
    })
    state.reports = state.reports.slice(0, 40)
  })
  refresh()
  return { ok: true, message: 'Report saved.' }
}

/**
 * Mark a call task done or open again.
 * @param id - Task id
 */
export const actionToggleTask = async (id: string): Promise<MarketingActionResult> => {
  await updateDesk((state) => {
    const task = state.tasks.find((item) => item.id === id)
    if (task) task.done = !task.done
  })
  refresh()
  return { ok: true, message: 'Task updated.' }
}
