import nodemailer from 'nodemailer'

import type { SendEmailResult } from '@/types/email'

/**
 * Creates a nodemailer transporter using Gmail SMTP credentials from env.
 */
export const createMailTransporter = () => {
  const user = process.env.SMTP_GMAIL_USER
  const pass = process.env.SMTP_GMAIL_PASS

  if (!user || !pass) {
    throw new Error('SMTP credentials are not configured. Set SMTP_GMAIL_USER and SMTP_GMAIL_PASS.')
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  })
}

/**
 * Sends an email to multiple recipients and returns per-recipient results.
 * @param recipients - List of recipient email addresses
 * @param subject - Email subject line
 * @param body - Plain-text email body
 */
export const sendBulkEmail = async (
  recipients: string[],
  subject: string,
  body: string,
): Promise<{ results: SendEmailResult[]; authError?: string }> => {
  const transporter = createMailTransporter()
  const from = process.env.SMTP_GMAIL_USER ?? ''

  try {
    await transporter.verify()
  } catch {
    return {
      results: recipients.map((recipient) => ({
        recipient,
        status: 'failed',
        error: 'SMTP authentication failed',
      })),
      authError:
        'Gmail rejected the login. Use an App Password (not your regular password) at https://myaccount.google.com/apppasswords',
    }
  }

  const results: SendEmailResult[] = []

  for (const to of recipients) {
    try {
      const info = await transporter.sendMail({
        from: `"Admin Finder" <${from}>`,
        to,
        subject,
        text: body,
      })

      results.push({
        recipient: to,
        status: 'sent',
        messageId: info.messageId,
      })
    } catch (error) {
      results.push({
        recipient: to,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Send failed',
      })
    }
  }

  return { results }
}
