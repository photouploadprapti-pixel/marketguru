'use client'

import { useState } from 'react'

import { cn } from '@/lib/cn'
import type { DeliveryRecord, EmailResult, SendEmailResponse } from '@/types/email'

interface EmailSenderProps {
  foundEmails: EmailResult[]
  onSent?: (records: DeliveryRecord[]) => void
}

/**
 * Bulk email sender with manual recipients and import from finder results.
 * @param foundEmails - Emails discovered by the finder section
 */
export const EmailSender = ({ foundEmails, onSent }: EmailSenderProps) => {
  const [recipients, setRecipients] = useState<string[]>([])
  const [manualEmail, setManualEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  const addRecipient = (email: string) => {
    const normalized = email.trim().toLowerCase()
    if (!normalized || recipients.includes(normalized)) return
    setRecipients((prev) => [...prev, normalized])
  }

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email))
  }

  const handleAddManual = () => {
    if (manualEmail.trim()) {
      addRecipient(manualEmail)
      setManualEmail('')
    }
  }

  const handleAddAllFound = () => {
    const emails = foundEmails.map((r) => r.email)
    const merged = [...new Set([...recipients, ...emails])]
    setRecipients(merged)
  }

  const handleSend = async () => {
    setFeedback(null)
    setLoading(true)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject, body }),
      })

      const data = (await response.json()) as SendEmailResponse & { error?: string }

      if (!response.ok) {
        setFeedback({ type: 'error', message: data.error ?? 'Send failed.' })
        return
      }

      setFeedback({
        type: data.failed.length ? 'error' : 'success',
        message: data.message,
      })
      onSent?.(data.records)
    } catch {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = [
    'w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm',
    'text-parchment-50 outline-none placeholder:text-parchment-500 focus:border-ember-400',
  ].join(' ')

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-6 shadow-card">
      <div className="mb-6">
        <h2 className="font-display text-3xl text-parchment-50">Email Sender</h2>
        <p className="mt-1 text-sm text-parchment-400">
          Compose a message and send it to your recipient list.
        </p>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-parchment-100">Recipients</label>
        <div className="flex flex-wrap gap-2">
          {recipients.length === 0 && (
            <span className="text-sm text-parchment-500">No recipients added yet.</span>
          )}
          {recipients.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full bg-ember-500/15 px-3 py-1 text-sm text-ember-100"
            >
              {email}
              <button
                type="button"
                onClick={() => removeRecipient(email)}
                className="ml-1 text-ember-300 hover:text-parchment-50"
                aria-label={`Remove ${email}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="email"
          placeholder="Add email manually"
          value={manualEmail}
          onChange={(e) => setManualEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
          className={`min-w-[200px] flex-1 ${fieldClass}`}
        />
        <button
          type="button"
          onClick={handleAddManual}
          disabled={!manualEmail.trim()}
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-parchment-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={handleAddAllFound}
          disabled={foundEmails.length === 0}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition',
            foundEmails.length === 0
              ? 'cursor-not-allowed bg-white/5 text-parchment-500'
              : 'bg-emerald-500 text-ink-950 hover:bg-emerald-400',
          )}
        >
          Add all found emails ({foundEmails.length})
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-parchment-100">
          Subject
        </label>
        <input
          id="subject"
          type="text"
          placeholder="Email subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="body" className="mb-1.5 block text-sm font-medium text-parchment-100">
          Message
        </label>
        <textarea
          id="body"
          rows={6}
          placeholder="Write your message here…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`${fieldClass} resize-y`}
        />
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={loading || recipients.length === 0 || !subject.trim() || !body.trim()}
        className={cn(
          'inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-ink-950 transition',
          loading || recipients.length === 0 || !subject.trim() || !body.trim()
            ? 'cursor-not-allowed bg-ember-500/40'
            : 'bg-ember-500 hover:bg-ember-400',
        )}
      >
        {loading ? 'Sending…' : `Send to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`}
      </button>

      {feedback && (
        <p
          className={cn(
            'mt-4 rounded-lg px-3 py-2 text-sm',
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-200'
              : 'bg-rose-500/10 text-rose-200',
          )}
        >
          {feedback.message}
        </p>
      )}
    </section>
  )
}
