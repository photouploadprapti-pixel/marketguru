'use client'

import { useState } from 'react'

import { actionSaveContacts } from '@/actions/action-contacts'
import { cn } from '@/lib/cn'
import type { EmailResult, FindEmailResponse } from '@/types/email'

interface EmailFinderProps {
  onResultsChange: (results: EmailResult[]) => void
}

/**
 * Email finder form — searches a domain for emails matching a person's name.
 * @param onResultsChange - Callback when search results update
 */
export const EmailFinder = ({ onResultsChange }: EmailFinderProps) => {
  const [domain, setDomain] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<EmailResult[]>([])
  const [meta, setMeta] = useState<{ domain: string; hasMxRecords: boolean } | null>(null)
  const [notice, setNotice] = useState('')

  const handleSearch = async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/find-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, firstName, lastName }),
      })

      const data = (await response.json()) as FindEmailResponse & { error?: string }

      if (!response.ok) {
        setError(data.error ?? 'Search failed.')
        return
      }

      setResults(data.results)
      setMeta({ domain: data.domain, hasMxRecords: data.hasMxRecords })
      onResultsChange(data.results)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verified = results.filter((r) => r.type === 'verified')
  const suggested = results.filter((r) => r.type === 'suggested')

  const fieldClass = [
    'w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm',
    'text-parchment-50 outline-none placeholder:text-parchment-500 focus:border-ember-400',
  ].join(' ')

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-6 shadow-card">
      <div className="mb-6">
        <h2 className="font-display text-3xl text-parchment-50">Email Finder</h2>
        <p className="mt-1 text-sm text-parchment-400">
          Enter a domain and name to find verified emails on the website and suggested patterns.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="domain" className="mb-1.5 block text-sm font-medium text-parchment-100">
            Domain
          </label>
          <input
            id="domain"
            type="text"
            placeholder="lantapilates.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-parchment-100">
            First name
          </label>
          <input
            id="firstName"
            type="text"
            placeholder="Jane"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-parchment-100">
            Last name
          </label>
          <input
            id="lastName"
            type="text"
            placeholder="Smith"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={loading || !domain.trim() || !firstName.trim() || !lastName.trim()}
        className={cn(
          'mt-4 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-ink-950 transition',
          loading || !domain.trim() || !firstName.trim() || !lastName.trim()
            ? 'cursor-not-allowed bg-ember-500/40'
            : 'bg-ember-500 hover:bg-ember-400',
        )}
      >
        {loading ? 'Searching…' : 'Find emails'}
      </button>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
      )}

      {meta && results.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-parchment-400">
            <span>Domain: <strong className="text-parchment-100">{meta.domain}</strong></span>
            <span className="text-parchment-500">|</span>
            <span>
              MX records:{' '}
              <span className={meta.hasMxRecords ? 'text-emerald-300' : 'text-amber-200'}>
                {meta.hasMxRecords ? 'Found' : 'Not found'}
              </span>
            </span>
          </div>

          {verified.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-emerald-300">
                  Verified on website ({verified.length})
                </h3>
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-parchment-50"
                  onClick={async () => {
                    const result = await actionSaveContacts(verified.map((item) => ({
                      name: `${firstName} ${lastName}`.trim(),
                      email: item.email,
                      website: domain,
                      company: domain,
                      source: 'finder' as const,
                    })))
                    setNotice(result.message)
                  }}
                >
                  Save as contacts
                </button>
              </div>
              {notice ? <p className="mb-2 text-sm text-ember-200">{notice}</p> : null}
              <ul className="space-y-2">
                {verified.map((item) => (
                  <EmailResultRow key={item.email} item={item} />
                ))}
              </ul>
            </div>
          )}

          {suggested.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-parchment-100">
                Suggested patterns ({suggested.length})
              </h3>
              <ul className="space-y-2">
                {suggested.map((item) => (
                  <EmailResultRow key={item.email} item={item} />
                ))}
              </ul>
            </div>
          )}

          {verified.length === 0 && suggested.length > 0 && (
            <p className="text-sm text-parchment-400">
              No matching emails were found on the website. Below are common address patterns for
              this name.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

interface EmailResultRowProps {
  item: EmailResult
}

/**
 * Single email result row with badge and optional source link.
 * @param item - Email result to display
 */
const EmailResultRow = ({ item }: EmailResultRowProps) => (
  <li className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-ink-950 px-3 py-2">
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        item.type === 'verified'
          ? 'bg-emerald-500/15 text-emerald-200'
          : 'bg-white/10 text-parchment-300',
      )}
    >
      {item.type === 'verified' ? 'Verified' : 'Suggested'}
    </span>
    <code className="text-sm text-parchment-50">{item.email}</code>
    {item.source && (
      <span className="text-xs text-parchment-500">from {item.source}</span>
    )}
  </li>
)
