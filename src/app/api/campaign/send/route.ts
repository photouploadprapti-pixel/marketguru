import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Narrow a request body to a record.
 * @param value - Parsed JSON
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Read a required string field.
 * @param body - Request object
 * @param key - Field name
 */
const readString = (body: Record<string, unknown>, key: string): string => {
  const value = body[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Send one HTML email through caller-supplied SMTP credentials.
 */
export const POST = async (request: Request) => {
  try {
    const parsed: unknown = await request.json()
    if (!isRecord(parsed)) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
    }

    const host = readString(parsed, 'host')
    const user = readString(parsed, 'user')
    const password = typeof parsed.password === 'string' ? parsed.password : ''
    const to = readString(parsed, 'to')
    const subject = readString(parsed, 'subject')
    const body = typeof parsed.body === 'string' ? parsed.body : ''
    const fromName = readString(parsed, 'fromName') || user

    if (!host || !user || !password || !to.includes('@') || !subject) {
      return NextResponse.json(
        { success: false, error: 'Host, user, password, recipient, and subject are required.' },
        { status: 400 },
      )
    }

    const transporter = nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: { user, pass: password },
    })

    await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject,
      html: body,
    })

    return NextResponse.json({ success: true, message: 'OK' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Send failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
