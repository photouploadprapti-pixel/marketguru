import nodemailer from 'nodemailer'

import { resolveMailHost } from '@/lib/warmup/resolve-host'
import type { EmailAccount } from '@/types/account'

export type SmtpAccount = Pick<
  EmailAccount,
  'email' | 'displayName' | 'smtpHost' | 'smtpPort' | 'smtpSecure'
> & {
  password: string
}

/**
 * Create a nodemailer transport for one mailbox.
 * @param account - SMTP credentials for the mailbox
 */
const createTransport = async (account: SmtpAccount) => {
  const host = await resolveMailHost(account.smtpHost)
  return nodemailer.createTransport({
    host,
    port: account.smtpPort,
    secure: account.smtpSecure || account.smtpPort === 465,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    tls: { servername: account.smtpHost },
    auth: {
      user: account.email,
      pass: account.password,
    },
  })
}

/**
 * Verify SMTP credentials without sending mail.
 */
export const verifySmtp = async (account: SmtpAccount) => {
  const transport = await createTransport(account)
  try {
    await transport.verify()
  } finally {
    transport.close()
  }
}

/**
 * Send a reply from one connected mailbox.
 * @param account - SMTP credentials for the mailbox
 * @param input - Recipient, subject, body, and optional reply headers
 */
export const sendMailboxReply = async (
  account: SmtpAccount,
  input: {
    to: string
    subject: string
    text: string
    inReplyTo?: string | null
  },
) => {
  const transport = await createTransport(account)
  const headers: Record<string, string> = {}
  if (input.inReplyTo) {
    headers['In-Reply-To'] = input.inReplyTo
    headers.References = input.inReplyTo
  }
  try {
    await transport.sendMail({
      from: `"${account.displayName}" <${account.email}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      headers,
    })
  } finally {
    transport.close()
  }
}

/**
 * Send an HTML note from one connected mailbox.
 * @param account - SMTP credentials for the mailbox
 * @param input - Recipient, subject, and HTML body
 */
export const sendMailboxHtml = async (
  account: SmtpAccount,
  input: { to: string; subject: string; html: string },
) => {
  const transport = await createTransport(account)
  try {
    await transport.sendMail({
      from: `"${account.displayName}" <${account.email}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })
  } finally {
    transport.close()
  }
}

/**
 * Send a plain-text warmup message.
 */
export const sendWarmupMail = async (
  account: SmtpAccount,
  input: { to: string; subject: string; text: string; token: string },
) => {
  const transport = await createTransport(account)
  try {
    await transport.sendMail({
      from: `"${account.displayName}" <${account.email}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      headers: {
        'X-Hearth-Warmup': input.token,
      },
    })
  } finally {
    transport.close()
  }
}
