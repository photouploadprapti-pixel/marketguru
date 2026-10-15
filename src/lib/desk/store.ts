import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'

import { createClient, type Client } from '@libsql/client/web'

import { asMarketing, emptyMarketing, type MarketingState } from '@/lib/marketing/records'
import type { InboxMessage } from '@/types/inbox'
import { isReplyIntent } from '@/types/inbox'
import type { Lead } from '@/types/pipeline'
import { isLeadStatus } from '@/types/pipeline'

export type DeskState = {
  leads: Lead[]
  messages: InboxMessage[]
} & MarketingState

const emptyDesk = (): DeskState => ({ leads: [], messages: [], ...emptyMarketing() })

let memory: DeskState | null = null
let client: Client | null = null
let tablesReady = false

/**
 * Strip quotes that sometimes get pasted into Vercel env values.
 * @param value - Raw environment value
 */
const cleanEnv = (value: string | undefined) =>
  value?.trim().replace(/^['"]+|['"]+$/g, '') ?? ''

/**
 * Turso database URL without the query string.
 */
const tursoUrl = () => cleanEnv(process.env.TURSO_DATABASE_URL).split('?')[0] || ''

/**
 * Turso auth token from the env var or the database URL.
 */
const tursoToken = () => {
  const direct = cleanEnv(process.env.TURSO_AUTH_TOKEN)
  if (direct) return direct
  const raw = cleanEnv(process.env.TURSO_DATABASE_URL)
  if (!raw) return ''
  try {
    const href = raw.replace(/^libsql:/, 'https:')
    const url = new URL(href.startsWith('http') ? href : `https://${href}`)
    return url.searchParams.get('authToken') ?? ''
  } catch {
    return ''
  }
}

/**
 * Whether a value is a plain object.
 * @param value - Unknown JSON
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Keep only lead records that have the fields the board needs.
 * @param value - Parsed JSON
 */
const asLead = (value: unknown): Lead | null => {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.email !== 'string') return null
  if (typeof value.status !== 'string' || !isLeadStatus(value.status)) return null
  const source = value.source === 'csv' || value.source === 'inbox' ? value.source : 'manual'
  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : '',
    email: value.email,
    company: typeof value.company === 'string' ? value.company : '',
    phone: typeof value.phone === 'string' ? value.phone : '',
    website: typeof value.website === 'string' ? value.website : '',
    city: typeof value.city === 'string' ? value.city : '',
    source,
    status: value.status,
    notes: typeof value.notes === 'string' ? value.notes : '',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  }
}

/**
 * Keep only inbox records that can be shown and replied to.
 * @param value - Parsed JSON
 */
const asMessage = (value: unknown): InboxMessage | null => {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.accountId !== 'string') return null
  if (typeof value.intent !== 'string' || !isReplyIntent(value.intent)) return null
  return {
    id: value.id,
    accountId: value.accountId,
    accountEmail: typeof value.accountEmail === 'string' ? value.accountEmail : '',
    uid: typeof value.uid === 'number' ? value.uid : 0,
    messageId: typeof value.messageId === 'string' ? value.messageId : null,
    fromName: typeof value.fromName === 'string' ? value.fromName : '',
    fromEmail: typeof value.fromEmail === 'string' ? value.fromEmail : '',
    subject: typeof value.subject === 'string' ? value.subject : '',
    snippet: typeof value.snippet === 'string' ? value.snippet : '',
    text: typeof value.text === 'string' ? value.text : '',
    receivedAt: typeof value.receivedAt === 'string' ? value.receivedAt : new Date().toISOString(),
    intent: value.intent,
    intentSource: value.intentSource === 'ai' ? 'ai' : 'rules',
    repliedAt: typeof value.repliedAt === 'string' ? value.repliedAt : null,
  }
}

/**
 * Normalize stored JSON into a desk state.
 * @param value - Parsed file or database payload
 */
const asDesk = (value: unknown): DeskState => {
  if (!isRecord(value)) return emptyDesk()
  const leads = Array.isArray(value.leads) ? value.leads.flatMap((item) => {
    const lead = asLead(item)
    return lead ? [lead] : []
  }) : []
  const messages = Array.isArray(value.messages) ? value.messages.flatMap((item) => {
    const message = asMessage(item)
    return message ? [message] : []
  }) : []
  return { leads, messages, ...asMarketing(value) }
}

/**
 * Local JSON path for the pipeline and inbox cache.
 */
const jsonPath = () => path.join(process.cwd(), 'data', 'desk.json')

/**
 * Read the local desk file, or an empty desk when it is missing.
 */
const readFile = (): DeskState => {
  try {
    return asDesk(JSON.parse(readFileSync(jsonPath(), 'utf8')) as unknown)
  } catch {
    return emptyDesk()
  }
}

/**
 * Write the desk file, creating the data folder when needed.
 * @param state - Pipeline leads and cached replies
 */
const writeFile = (state: DeskState) => {
  mkdirSync(path.dirname(jsonPath()), { recursive: true })
  writeFileSync(jsonPath(), JSON.stringify(state, null, 2), 'utf8')
}

/**
 * Shared Turso client for the desk document.
 */
const getTurso = () => {
  const url = tursoUrl()
  const authToken = tursoToken()
  if (!url || !authToken) return null
  client ??= createClient({ url, authToken })
  return client
}

/**
 * Create the single-row desk table once per process.
 */
const ensureTable = async () => {
  const turso = getTurso()
  if (!turso || tablesReady) return
  await turso.execute(
    'CREATE TABLE IF NOT EXISTS desk_state (id TEXT PRIMARY KEY, payload TEXT NOT NULL)',
  )
  tablesReady = true
}

/**
 * Load the pipeline and inbox cache from the active store.
 */
export const loadDesk = async (): Promise<DeskState> => {
  const turso = getTurso()
  if (turso) {
    await ensureTable()
    const result = await turso.execute("SELECT payload FROM desk_state WHERE id = 'main'")
    const payload = result.rows[0]?.payload
    return typeof payload === 'string' ? asDesk(JSON.parse(payload) as unknown) : emptyDesk()
  }
  if (process.env.VERCEL) {
    memory ??= emptyDesk()
    return memory
  }
  return readFile()
}

/**
 * Persist the pipeline and inbox cache.
 * @param state - Next desk snapshot
 */
export const saveDesk = async (state: DeskState) => {
  const turso = getTurso()
  if (turso) {
    await ensureTable()
    await turso.execute({
      sql: 'INSERT OR REPLACE INTO desk_state (id, payload) VALUES (?, ?)',
      args: ['main', JSON.stringify(state)],
    })
    return
  }
  if (process.env.VERCEL) {
    memory = state
    return
  }
  writeFile(state)
}

/**
 * Load, change, and save the desk in one step.
 * @param change - Mutates the current snapshot
 */
export const updateDesk = async (change: (state: DeskState) => void) => {
  const state = await loadDesk()
  change(state)
  await saveDesk(state)
  return state
}

/**
 * True when this host will forget leads after the process stops.
 */
export const isDeskEphemeral = () => Boolean(process.env.VERCEL && !getTurso())
