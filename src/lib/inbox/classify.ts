import { isReplyIntent, type ReplyIntent } from '@/types/inbox'

export type Classification = {
  intent: ReplyIntent
  source: 'rules' | 'ai'
}

const OOO = /out of office|automatic reply|auto-?reply|away from (the )?office|on vacation|ooo\b/i
const NOT_INTERESTED = /not interested|no thanks|unsubscribe|remove me|stop emailing|do not contact|don't contact/i
const INTERESTED = /interested|let'?s talk|schedule|book a call|sounds good|tell me more|send (me )?pricing|demo/i

/**
 * Label a reply from common phrases when no model is configured.
 * @param subject - Message subject
 * @param text - Plain-text body
 */
export const classifyWithRules = (subject: string, text: string): ReplyIntent => {
  const sample = `${subject}\n${text}`.slice(0, 4000)
  if (OOO.test(sample)) return 'out_of_office'
  if (NOT_INTERESTED.test(sample)) return 'not_interested'
  if (INTERESTED.test(sample)) return 'interested'
  return 'unknown'
}

/**
 * Map a model string onto a reply intent.
 * @param value - Raw model output
 */
const parseIntent = (value: string): ReplyIntent | null => {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return isReplyIntent(key) ? key : null
}

/**
 * Ask the configured model to label one reply. Returns null when unset or failing.
 * @param subject - Message subject
 * @param text - Plain-text body
 */
const classifyWithModel = async (subject: string, text: string): Promise<ReplyIntent | null> => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'Classify the sales reply.',
            'Reply JSON only:',
            '{"intent":"interested"|"not_interested"|"out_of_office"|"unknown"}',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Subject: ${subject}\n\n${text.slice(0, 3000)}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return null
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object') return null
  const choices = 'choices' in payload ? payload.choices : null
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null
  const message = 'message' in choices[0] ? choices[0].message : null
  if (!message || typeof message !== 'object' || !('content' in message)) return null
  if (typeof message.content !== 'string') return null
  const parsed: unknown = JSON.parse(message.content)
  if (!parsed || typeof parsed !== 'object' || !('intent' in parsed)) return null
  return typeof parsed.intent === 'string' ? parseIntent(parsed.intent) : null
}

/**
 * Label a reply with the model when OPENAI_API_KEY is set, otherwise with rules.
 * @param subject - Message subject
 * @param text - Plain-text body
 */
export const classifyReply = async (subject: string, text: string): Promise<Classification> => {
  try {
    const intent = await classifyWithModel(subject, text)
    if (intent) return { intent, source: 'ai' }
  } catch {
    // Rules still label the message when the model is unreachable.
  }
  return { intent: classifyWithRules(subject, text), source: 'rules' }
}
