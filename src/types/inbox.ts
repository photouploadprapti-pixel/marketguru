export const REPLY_INTENTS = [
  'interested',
  'not_interested',
  'out_of_office',
  'unknown',
] as const

export type ReplyIntent = (typeof REPLY_INTENTS)[number]

export type IntentSource = 'rules' | 'ai'

export type InboxMessage = {
  id: string
  accountId: string
  accountEmail: string
  uid: number
  messageId: string | null
  fromName: string
  fromEmail: string
  subject: string
  snippet: string
  text: string
  receivedAt: string
  intent: ReplyIntent
  intentSource: IntentSource
  repliedAt: string | null
}

export const INTENT_LABELS: Record<ReplyIntent, string> = {
  interested: 'Interested',
  not_interested: 'Not Interested',
  out_of_office: 'Out of Office',
  unknown: 'Unclassified',
}

/**
 * Whether a value is a known reply intent.
 * @param value - Unknown label
 */
export const isReplyIntent = (value: string): value is ReplyIntent =>
  (REPLY_INTENTS as readonly string[]).includes(value)
