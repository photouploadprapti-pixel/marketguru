import { fillTemplate } from '@/lib/leads/csv'
import { loadDesk, updateDesk } from '@/lib/desk/store'
import { sendMailboxHtml } from '@/lib/warmup/smtp'
import { getAccountWithSecret } from '@/lib/warmup/db'

/**
 * Send sequence steps that are due, and stop anyone who replied or is blocked.
 */
export const runDueSequences = async (): Promise<string> => {
  const state = await loadDesk()
  const now = Date.now()
  const due = state.enrollments.filter(
    (item) => item.status === 'active' && Date.parse(item.nextAt) <= now,
  )
  if (!due.length) return 'No follow-ups are due.'

  let sent = 0
  let stopped = 0
  const problems: string[] = []

  for (const enrollment of due) {
    const fresh = await loadDesk()
    const current = fresh.enrollments.find((item) => item.id === enrollment.id)
    const sequence = fresh.sequences.find((item) => item.id === enrollment.sequenceId)
    if (!current || current.status !== 'active' || !sequence) continue

    const email = current.email.toLowerCase()
    const blocked = fresh.suppressions.some((item) => item.email === email)
    const replied = fresh.messages.some(
      (message) => message.fromEmail.toLowerCase() === email && message.intent !== 'out_of_office',
    )
    if (blocked || replied) {
      await updateDesk((desk) => {
        const row = desk.enrollments.find((item) => item.id === current.id)
        if (row && row.status === 'active') row.status = blocked ? 'suppressed' : 'replied'
      })
      stopped += 1
      continue
    }

    const step = sequence.steps[current.step]
    if (!step?.subject) {
      await updateDesk((desk) => {
        const row = desk.enrollments.find((item) => item.id === current.id)
        if (row) row.status = 'done'
      })
      continue
    }

    const secret = await getAccountWithSecret(sequence.accountId)
    if (!secret) {
      problems.push(`${sequence.name}: mailbox missing`)
      continue
    }

    const contact = fresh.contacts.find((item) => item.email === email)
    const row = {
      Name: contact?.name || 'there',
      City: contact?.city || '',
      Email: email,
    }

    try {
      await sendMailboxHtml(
        { ...secret.account, password: secret.password },
        {
          to: email,
          subject: fillTemplate(step.subject, row),
          html: fillTemplate(step.body, row),
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Send failed'
      problems.push(`${email}: ${message}`)
      continue
    }

    sent += 1
    await updateDesk((desk) => {
      const saved = desk.enrollments.find((item) => item.id === current.id)
      if (!saved || saved.status !== 'active') return
      const nextIndex = saved.step + 1
      const next = sequence.steps[nextIndex]
      if (!next) {
        saved.status = 'done'
        return
      }
      saved.step = nextIndex
      saved.nextAt = new Date(Date.now() + next.delayDays * 86400000).toISOString()
    })
  }

  const summary = `Sent ${sent} follow-up${sent === 1 ? '' : 's'}. Stopped ${stopped}.`
  return problems.length ? `${summary} ${problems.slice(0, 3).join(' ')}` : summary
}
