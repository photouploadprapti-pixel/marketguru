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

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Email Sender</h2>
        <p className="mt-1 text-sm text-slate-500">
          Compose a message and send it to your recipient list.
        </p>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Recipients</label>
        <div className="flex flex-wrap gap-2">
          {recipients.length === 0 && (
            <span className="text-sm text-slate-400">No recipients added yet.</span>
          )}
          {recipients.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
            >
              {email}
              <button
                type="button"
                onClick={() => removeRecipient(email)}
                className="ml-1 text-indigo-400 hover:text-indigo-700"
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
          className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={handleAddManual}
          disabled={!manualEmail.trim()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={handleAddAllFound}
          disabled={foundEmails.length === 0}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition',
            foundEmails.length === 0
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'bg-emerald-600 text-white hover:bg-emerald-700',
          )}
        >
          Add all found emails ({foundEmails.length})
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-slate-700">
          Subject
        </label>
        <input
          id="subject"
          type="text"
          placeholder="Email subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="body" className="mb-1.5 block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="body"
          rows={6}
          placeholder="Write your message here…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={loading || recipients.length === 0 || !subject.trim() || !body.trim()}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-white transition',
          loading || recipients.length === 0 || !subject.trim() || !body.trim()
            ? 'cursor-not-allowed bg-indigo-300'
            : 'bg-indigo-600 hover:bg-indigo-700',
        )}
      >
        {loading ? 'Sending…' : `Send to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`}
      </button>

      {feedback && (
        <p
          className={cn(
            'mt-4 rounded-lg px-3 py-2 text-sm',
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
          )}
        >
          {feedback.message}
        </p>
      )}
    </section>
  )
}
