import { NextResponse } from 'next/server'

import { loadDesk } from '@/lib/desk/store'
import { isUsableEmail } from '@/lib/leads/usable-email'
import { createRecordId } from '@/lib/finder/delivery-utils'
import { getUndeliverableReason } from '@/lib/finder/email-verifier'
import { sendBulkEmail } from '@/lib/finder/mailer'
import type { DeliveryRecord, SendEmailRequest, SendEmailResponse } from '@/types/email'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/**
 * POST /api/send-email — sends an email to all specified recipients.
 */
export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as SendEmailRequest
    const { recipients, subject, body: emailBody } = body

    if (!recipients?.length) {
      return NextResponse.json({ error: 'At least one recipient is required.' }, { status: 400 })
    }

    if (!subject?.trim()) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 })
    }

    if (!emailBody?.trim()) {
      return NextResponse.json({ error: 'Email body is required.' }, { status: 400 })
    }

    const validRecipients = [...new Set(recipients.map((r) => r.trim().toLowerCase()))].filter(
      (email) => EMAIL_REGEX.test(email) && isUsableEmail(email),
    )

    if (!validRecipients.length) {
      return NextResponse.json({ error: 'No valid email addresses provided.' }, { status: 400 })
    }

    const desk = await loadDesk()
    const blocked = new Set(desk.suppressions.map((item) => item.email))
    const skipped = validRecipients.filter((email) => blocked.has(email))
    const allowed = validRecipients.filter((email) => !blocked.has(email))

    if (!allowed.length) {
      return NextResponse.json(
        { error: 'Every recipient is on the do-not-contact list.' },
        { status: 400 },
      )
    }

    const trimmedSubject = subject.trim()
    const trimmedBody = emailBody.trim()
    const batchId = createRecordId()
    const sentAt = new Date().toISOString()

    const { results, authError } = await sendBulkEmail(
      allowed,
      trimmedSubject,
      trimmedBody,
    )

    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    const records: DeliveryRecord[] = []

    for (const result of results) {
      const undeliverableReason = await getUndeliverableReason(result.recipient)

      let status: DeliveryRecord['status']
      let error: string | undefined

      if (result.status === 'failed') {
        status = 'failed'
        error = result.error
      } else if (undeliverableReason) {
        status = 'bounced'
        error = undeliverableReason
      } else {
        status = 'pending'
      }

      records.push({
        id: createRecordId(),
        batchId,
        recipient: result.recipient,
        subject: trimmedSubject,
        messageId: result.messageId,
        status,
        error,
        sentAt,
      })
    }

    const failed = results.filter((r) => r.status === 'failed').map((r) => r.recipient)
    const sent = results.filter((r) => r.status === 'sent').length

    const response: SendEmailResponse = {
      success: failed.length === 0,
      sent,
      failed,
      batchId,
      records,
      message:
        failed.length === 0
          ? `Successfully sent to ${sent} recipient${sent === 1 ? '' : 's'}.${skipped.length ? ` Skipped ${skipped.length} blocked.` : ''} Check delivery status below.`
          : `Sent to ${sent} recipient${sent === 1 ? '' : 's'}. Failed: ${failed.join(', ')}`,
    }

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send emails.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
