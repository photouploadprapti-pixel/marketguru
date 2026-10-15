'use server'

import { revalidatePath } from 'next/cache'

import { applyInboxSignals } from '@/lib/marketing/apply-inbox'
import { loadDesk, updateDesk } from '@/lib/desk/store'
import { pullMailboxReplies } from '@/lib/inbox/sync'
import { sendMailboxReply } from '@/lib/warmup/smtp'
import { getAccountWithSecret, listAccounts } from '@/lib/warmup/db'

export type InboxActionResult = {
  ok: boolean
  message: string
}

/**
 * Refresh inbox and pipeline pages after a mailbox change.
 */
const refresh = () => {
  revalidatePath('/inbox')
  revalidatePath('/pipeline')
  revalidatePath('/reports')
  revalidatePath('/contacts')
  revalidatePath('/')
}

/**
 * Read new replies from every connected mailbox and label them.
 */
export const actionSyncInbox = async (): Promise<InboxActionResult> => {
  const accounts = await listAccounts()
  if (!accounts.length) {
    return { ok: false, message: 'Add a mailbox in Warmup before refreshing the inbox.' }
  }
  const ownEmails = new Set(accounts.map((account) => account.email.toLowerCase()))
  const warnings: string[] = []
  let added = 0

  for (const account of accounts) {
    const secret = await getAccountWithSecret(account.id)
    if (!secret) continue
    try {
      const current = await loadDesk()
      const known = new Set(current.messages.map((message) => message.id))
      const pulled = await pullMailboxReplies(
        { ...secret.account, password: secret.password },
        ownEmails,
        known,
      )
      if (!pulled.length) continue
      added += pulled.length
      await updateDesk((state) => {
        const emails = new Set(pulled.map((message) => message.fromEmail))
        state.messages = [...pulled, ...state.messages].slice(0, 300)
        for (const lead of state.leads) {
          if (!emails.has(lead.email)) continue
          if (lead.status === 'new' || lead.status === 'contacted') {
            lead.status = 'replied'
            lead.updatedAt = new Date().toISOString()
          }
        }
        applyInboxSignals(state, pulled)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read mailbox'
      warnings.push(`${account.email}: ${message}`)
    }
  }

  refresh()
  const summary = added
    ? `Added ${added} repl${added === 1 ? 'y' : 'ies'}.`
    : 'No new outside replies.'
  return {
    ok: warnings.length === 0,
    message: warnings.length ? `${summary} ${warnings.join(' ')}` : summary,
  }
}

/**
 * Send a reply from the mailbox that received the message.
 * @param messageId - Cached inbox message id
 * @param body - Reply text
 */
export const actionReplyToMessage = async (
  messageId: string,
  body: string,
): Promise<InboxActionResult> => {
  const text = body.trim()
  if (!text) return { ok: false, message: 'Write a reply first.' }
  const state = await loadDesk()
  const message = state.messages.find((item) => item.id === messageId)
  if (!message) return { ok: false, message: 'That message is no longer in the inbox.' }
  const secret = await getAccountWithSecret(message.accountId)
  if (!secret) return { ok: false, message: 'The mailbox for this reply is missing.' }

  const subject = /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`
  try {
    await sendMailboxReply(
      { ...secret.account, password: secret.password },
      {
        to: message.fromEmail,
        subject,
        text,
        inReplyTo: message.messageId,
      },
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Send failed'
    return { ok: false, message: reason }
  }

  await updateDesk((desk) => {
    const saved = desk.messages.find((item) => item.id === messageId)
    if (saved) saved.repliedAt = new Date().toISOString()
    const lead = desk.leads.find((item) => item.email === message.fromEmail)
    if (lead && (lead.status === 'new' || lead.status === 'contacted')) {
      lead.status = 'replied'
      lead.updatedAt = new Date().toISOString()
    }
  })
  refresh()
  return { ok: true, message: `Sent from ${secret.account.email}.` }
}
