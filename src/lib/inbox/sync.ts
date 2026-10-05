import { simpleParser } from 'mailparser'
import { ImapFlow } from 'imapflow'

import { classifyReply } from '@/lib/inbox/classify'
import type { EmailAccount } from '@/types/account'
import type { InboxMessage } from '@/types/inbox'

const LOOKBACK_MS = 21 * 24 * 60 * 60 * 1000
const PER_MAILBOX = 25

type MailboxLogin = EmailAccount & { password: string }

/**
 * Whether this message is warmup traffic between our own mailboxes.
 * @param source - Raw message source
 * @param fromEmail - Sender address
 * @param ownEmails - Connected mailbox addresses
 */
const isInternal = (source: string, fromEmail: string, ownEmails: Set<string>) => {
  if (/X-Hearth-Warmup:/i.test(source)) return true
  return ownEmails.has(fromEmail.toLowerCase())
}

/**
 * Pull recent outside replies from one mailbox.
 * @param login - Mailbox with a decrypted password
 * @param ownEmails - Addresses that belong to this desk
 * @param knownIds - Message ids already cached
 */
export const pullMailboxReplies = async (
  login: MailboxLogin,
  ownEmails: Set<string>,
  knownIds: Set<string>,
): Promise<InboxMessage[]> => {
  const client = new ImapFlow({
    host: login.imapHost,
    port: login.imapPort,
    secure: login.imapSecure || login.imapPort === 993,
    auth: { user: login.email, pass: login.password },
    logger: false,
  })
  const found: InboxMessage[] = []
  await client.connect()
  try {
    await client.mailboxOpen('INBOX')
    const since = new Date(Date.now() - LOOKBACK_MS)
    const listed = await client.search({ since }, { uid: true })
    const uids = (Array.isArray(listed) ? listed : []).slice(-PER_MAILBOX)
    if (!uids.length) return []
    const messages = await client.fetchAll(uids, { source: true }, { uid: true })
    for (const item of messages) {
      const id = `${login.id}:${item.uid}`
      if (knownIds.has(id) || !item.source) continue
      const source = item.source.toString('utf8')
      const mail = await simpleParser(item.source)
      const from = mail.from?.value[0]
      const fromEmail = (from?.address ?? '').toLowerCase()
      if (!fromEmail || /mailer-daemon|postmaster/i.test(fromEmail)) continue
      if (isInternal(source, fromEmail, ownEmails)) continue
      const text = (mail.text || '').slice(0, 8000)
      const subject = mail.subject || '(no subject)'
      const label = await classifyReply(subject, text)
      found.push({
        id,
        accountId: login.id,
        accountEmail: login.email,
        uid: item.uid,
        messageId: mail.messageId ?? null,
        fromName: from?.name || fromEmail,
        fromEmail,
        subject,
        snippet: text.replace(/\s+/g, ' ').slice(0, 180),
        text,
        receivedAt: (mail.date ?? new Date()).toISOString(),
        intent: label.intent,
        intentSource: label.source,
        repliedAt: null,
      })
    }
  } finally {
    if (client.usable) await client.logout()
  }
  return found
}
