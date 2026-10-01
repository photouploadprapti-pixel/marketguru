import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

/**
 * Normalize an IMAP search result into numeric UIDs.
 * @param value - Search result, which may be empty
 */
const asUids = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : []

const SKIP_FRAGMENTS = [
  'a2hosted',
  'starka',
  'mailer-daemon',
  'postmaster',
  'google.com',
  'mx.',
]

/**
 * Collect unique bounced recipient addresses from an IMAP inbox.
 * @param options - Mailbox connection details
 */
export const listBouncedEmails = async (options: {
  host: string
  port: number
  user: string
  password: string
}): Promise<string[]> => {
  const client = new ImapFlow({
    host: options.host,
    port: options.port,
    secure: options.port === 993,
    auth: { user: options.user, pass: options.password },
    logger: false,
  })

  const failed = new Set<string>()
  const pattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const userEmail = options.user.toLowerCase()

  await client.connect()
  try {
    await client.mailboxOpen('INBOX')
    const bySubject = await client.search(
      { subject: 'Delivery Status Notification' },
      { uid: true },
    )
    const byFrom = await client.search({ from: 'Mailer-Daemon' }, { uid: true })
    const uids = [...new Set([...asUids(bySubject), ...asUids(byFrom)])].slice(-200)
    if (!uids.length) return []

    const messages = await client.fetchAll(uids, { source: true }, { uid: true })
    for (const message of messages) {
      const source = message.source
      if (!source) continue
      const mail = await simpleParser(source)
      const text = `${mail.text ?? ''} ${typeof mail.html === 'string' ? mail.html : ''}`
      for (const addr of text.match(pattern) ?? []) {
        const lower = addr.toLowerCase().trim()
        if (lower === userEmail) continue
        if (SKIP_FRAGMENTS.some((fragment) => lower.includes(fragment))) continue
        failed.add(lower)
      }
    }
  } finally {
    if (client.usable) await client.logout()
  }

  return [...failed]
}
