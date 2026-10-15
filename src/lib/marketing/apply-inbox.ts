import { createId } from '@/lib/cn'
import type { DeskState } from '@/lib/desk/store'
import { isUsableEmail } from '@/lib/leads/usable-email'
import type { InboxMessage } from '@/types/inbox'

/**
 * Record replies, blocks, and call tasks from newly pulled inbox mail.
 * @param state - Desk snapshot being saved
 * @param pulled - Messages added in this refresh
 */
export const applyInboxSignals = (state: DeskState, pulled: InboxMessage[]) => {
  const now = new Date().toISOString()

  for (const message of pulled) {
    const email = message.fromEmail.toLowerCase()
    if (!email.includes('@')) continue

    const blob = `${message.subject} ${message.snippet} ${message.text}`.toLowerCase()
    const unsubscribed = blob.includes('unsubscribe')
    if (message.intent === 'not_interested' || unsubscribed) {
      const blocked = state.suppressions.some((item) => item.email === email)
      if (!blocked) {
        state.suppressions.unshift({
          email,
          reason: unsubscribed ? 'unsubscribe' : 'not_interested',
          createdAt: now,
        })
      }
    }

    const stop = message.intent !== 'out_of_office'
    if (stop) {
      for (const enrollment of state.enrollments) {
        if (enrollment.email === email && enrollment.status === 'active') {
          enrollment.status = message.intent === 'not_interested' ? 'suppressed' : 'replied'
        }
      }
    }

    if (message.intent === 'interested') {
      const open = state.tasks.some((task) => task.email === email && !task.done)
      if (!open) {
        state.tasks.unshift({
          id: createId(8),
          email,
          name: message.fromName,
          title: `Call ${message.fromName || email}`,
          done: false,
          createdAt: now,
        })
      }
    }

    for (const report of state.reports) {
      if (!report.recipients.includes(email)) continue
      if (!report.repliedEmails.includes(email)) report.repliedEmails.push(email)
      if (message.intent === 'interested' && !report.interestedEmails.includes(email)) {
        report.interestedEmails.push(email)
      }
    }
  }
}
