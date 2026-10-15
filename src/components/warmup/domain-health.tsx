'use client'

import { useState, type FormEvent } from 'react'

type HealthResult = {
  domain: string
  spf: boolean
  dkim: boolean
  dmarc: boolean
  safe: boolean
  note: string
}

/**
 * Look up SPF, DKIM, and DMARC for a mailbox domain.
 */
export const DomainHealth = () => {
  const [domain, setDomain] = useState('')
  const [result, setResult] = useState<HealthResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/domain-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const json = (await response.json()) as HealthResult & { error?: string }
      if (!response.ok) {
        setResult(null)
        setError(json.error ?? 'Lookup failed.')
        return
      }
      setResult(json)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lookup failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5">
      <h2 className="font-display text-2xl text-parchment-50">Safe to send?</h2>
      <p className="mt-2 max-w-2xl text-sm text-parchment-400">
        Checks public SPF, DMARC, and common DKIM selectors for the mailbox domain.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-2">
        <input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="studio.com"
          className="min-w-56 flex-1 rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-parchment-50 outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-50"
        >
          {busy ? 'Checking...' : 'Check domain'}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {result ? (
        <div className="mt-4">
          <p className={result.safe ? 'text-sm text-emerald-300' : 'text-sm text-ember-200'}>
            {result.safe ? 'Safe to send today' : 'Not ready to send'}
            {` · ${result.domain}`}
          </p>
          <p className="mt-2 text-sm text-parchment-300">
            SPF {result.spf ? 'found' : 'missing'}
            {' · '}
            DKIM {result.dkim ? 'found' : 'not on common selectors'}
            {' · '}
            DMARC {result.dmarc ? 'found' : 'missing'}
          </p>
          <p className="mt-2 text-sm text-parchment-400">{result.note}</p>
        </div>
      ) : null}
    </section>
  )
}
