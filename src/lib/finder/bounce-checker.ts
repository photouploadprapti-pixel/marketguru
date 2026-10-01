import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

const GMAIL_ALL_MAIL = '[Gmail]/All Mail'

const BOUNCE_FROM_PATTERNS = [
  /mailer-daemon@googlemail\.com/i,
  /mailer-daemon@/i,
  /postmaster@/i,
  /mail delivery subsystem/i,
]

const BOUNCE_SUBJECT_PATTERNS = [
  /undelivered/i,
  /delivery status notification/i,
  /mail delivery failed/i,
  /returned mail/i,
  /failure notice/i,
  /delivery failure/i,
  /address not found/i,
  /delivery incomplete/i,
]

const RECIPIENT_PATTERNS = [
  /wasn't delivered to\s+[<?]?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/gi,
  /couldn't be found[^@]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  /Final-Recipient:\s*rfc822;\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  /Original-Recipient:\s*rfc822;\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  /Delivery to the following recipient failed[^@]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
]

export interface BounceInfo {
  recipient: string
  reason: string
  messageId?: string
}

/**
 * Creates an IMAP client for the configured Gmail account.
 */
const createImapClient = (): ImapFlow => {
  const user = process.env.SMTP_GMAIL_USER
  const pass = process.env.SMTP_GMAIL_PASS

  if (!user || !pass) {
    throw new Error('SMTP credentials are not configured.')
  }

  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  })
}

/**
 * Determines whether a message looks like a bounce notification.
 * @param from - Sender address
 * @param subject - Email subject line
 */
const isBounceMessage = (from: string, subject: string): boolean => {
  const fromMatch = BOUNCE_FROM_PATTERNS.some((pattern) => pattern.test(from))
  const subjectMatch = BOUNCE_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject))
  return fromMatch || subjectMatch
}

/**
 * Extracts bounced recipient addresses from a bounce message body.
 * @param text - Combined message text content
 */
const extractBouncedRecipients = (text: string): string[] => {
  const sender = process.env.SMTP_GMAIL_USER?.toLowerCase() ?? ''
  const found = new Set<string>()

  for (const pattern of RECIPIENT_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      const email = match[1]?.toLowerCase()
      if (email && email !== sender && !email.includes('mailer-daemon')) {
        found.add(email)
      }
    }
  }

  return [...found]
}

/**
 * Collects unique UIDs from multiple IMAP search queries.
 * @param client - Connected IMAP client
 * @param since - Earliest date to search
 */
const searchBounceUids = async (client: ImapFlow, since: Date): Promise<number[]> => {
  const uidSet = new Set<number>()

  const queries = [
    { since, from: 'mailer-daemon@googlemail.com' },
    { since, subject: 'Delivery Status Notification' },
    { since, subject: 'Undelivered Mail Returned to Sender' },
    { since, subject: 'Address not found' },
  ]

  for (const query of queries) {
    const result = await client.search(query, { uid: true })
    if (result === false) continue
    for (const uid of result) uidSet.add(uid)
  }

  return [...uidSet]
}

/**
 * Scans Gmail All Mail for bounce notifications.
 * @param sinceDays - How many days back to search
 */
export const fetchBounceNotifications = async (sinceDays = 14): Promise<BounceInfo[]> => {
  const client = createImapClient()
  const bounces = new Map<string, BounceInfo>()
  const since = new Date()
  since.setDate(since.getDate() - sinceDays)

  await client.connect()

  try {
    const lock = await client.getMailboxLock(GMAIL_ALL_MAIL)

    try {
      const uids = await searchBounceUids(client, since)
      if (uids.length === 0) return []

      for await (const message of client.fetch(uids, {
        envelope: true,
        source: true,
      })) {
        const from = message.envelope?.from?.[0]?.address ?? ''
        const fromName = message.envelope?.from?.[0]?.name ?? ''
        const subject = message.envelope?.subject ?? ''

        if (!isBounceMessage(`${from} ${fromName}`, subject) || !message.source) continue

        const parsed = await simpleParser(message.source)
        const content = `${parsed.text ?? ''} ${parsed.html ?? ''} ${subject}`
        const recipients = extractBouncedRecipients(content)

        const reason =
          parsed.text?.split('\n').find((line) => /wasn't delivered|couldn't be found|failed/i.test(line))?.trim()
          ?? subject
          ?? 'Delivery failed'

        const originalMessageId = parsed.headers.get('in-reply-to')?.toString()
          ?? parsed.headers.get('references')?.toString()

        for (const recipient of recipients) {
          if (!bounces.has(recipient)) {
            bounces.set(recipient, {
              recipient,
              reason,
              messageId: originalMessageId,
            })
          }
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  return [...bounces.values()]
}

/**
 * Returns a map of bounced email addresses to bounce details.
 * @param sinceDays - How many days back to search
 */
export const fetchBouncedAddresses = async (sinceDays = 14): Promise<Map<string, BounceInfo>> => {
  const notifications = await fetchBounceNotifications(sinceDays)
  return new Map(notifications.map((b) => [b.recipient, b]))
}
