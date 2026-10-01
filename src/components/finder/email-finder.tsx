'use client'

import { useState } from 'react'

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

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Email Finder</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter a domain and name to find verified emails on the website and suggested patterns.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="domain" className="mb-1.5 block text-sm font-medium text-slate-700">
            Domain
          </label>
          <input
            id="domain"
            type="text"
            placeholder="lantapilates.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-slate-700">
            First name
          </label>
          <input
            id="firstName"
            type="text"
            placeholder="Jane"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-slate-700">
            Last name
          </label>
          <input
            id="lastName"
            type="text"
            placeholder="Smith"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={loading || !domain.trim() || !firstName.trim() || !lastName.trim()}
        className={cn(
          'mt-4 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-white transition',
          loading || !domain.trim() || !firstName.trim() || !lastName.trim()
            ? 'cursor-not-allowed bg-indigo-300'
            : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
        )}
      >
        {loading ? 'Searching…' : 'Find emails'}
      </button>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {meta && results.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>Domain: <strong className="text-slate-700">{meta.domain}</strong></span>
            <span className="text-slate-300">|</span>
            <span>
              MX records:{' '}
              <span className={meta.hasMxRecords ? 'text-emerald-600' : 'text-amber-600'}>
                {meta.hasMxRecords ? 'Found' : 'Not found'}
              </span>
            </span>
          </div>

          {verified.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-emerald-700">
                Verified on website ({verified.length})
              </h3>
              <ul className="space-y-2">
                {verified.map((item) => (
                  <EmailResultRow key={item.email} item={item} />
                ))}
              </ul>
            </div>
          )}

          {suggested.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
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
            <p className="text-sm text-slate-500">
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
  <li className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        item.type === 'verified'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-200 text-slate-600',
      )}
    >
      {item.type === 'verified' ? 'Verified' : 'Suggested'}
    </span>
    <code className="text-sm text-slate-800">{item.email}</code>
    {item.source && (
      <span className="text-xs text-slate-400">from {item.source}</span>
    )}
  </li>
)
