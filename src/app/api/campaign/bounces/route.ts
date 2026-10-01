import { NextResponse } from 'next/server'

import { listBouncedEmails } from '@/lib/leads/bounces'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Narrow a request body to a record.
 * @param value - Parsed JSON
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Scan an IMAP inbox for bounce notifications.
 */
export const POST = async (request: Request) => {
  try {
    const parsed: unknown = await request.json()
    if (!isRecord(parsed)) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
    }

    const host = typeof parsed.host === 'string' ? parsed.host.trim() : ''
    const user = typeof parsed.user === 'string' ? parsed.user.trim() : ''
    const password = typeof parsed.password === 'string' ? parsed.password : ''
    const port = typeof parsed.port === 'number' ? parsed.port : 993

    if (!host || !user || !password) {
      return NextResponse.json(
        { success: false, error: 'IMAP host, user, and password are required.' },
        { status: 400 },
      )
    }

    const failedEmails = await listBouncedEmails({ host, port, user, password })
    return NextResponse.json({ success: true, failed_emails: failedEmails })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bounce scan failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
