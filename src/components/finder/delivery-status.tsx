'use client'

import { useMemo, useState } from 'react'

import { summarizeDeliveryRecords } from '@/lib/finder/delivery-utils'
import { cn } from '@/lib/cn'
import type { CheckDeliveryResponse, DeliveryRecord } from '@/types/email'

const STATUS_LABELS: Record<DeliveryRecord['status'], string> = {
  delivered: 'Delivered',
  bounced: 'Bounced',
  pending: 'Pending',
  failed: 'Failed to send',
}

const STATUS_STYLES: Record<DeliveryRecord['status'], string> = {
  delivered: 'bg-emerald-500/15 text-emerald-200',
  bounced: 'bg-rose-500/15 text-rose-200',
  pending: 'bg-amber-500/15 text-amber-100',
  failed: 'bg-white/10 text-parchment-300',
}

interface DeliveryStatusPanelProps {
  records: DeliveryRecord[]
  loaded: boolean
  onRecordsChange: (records: DeliveryRecord[]) => void
}

/**
 * Shows delivery and bounce status for sent emails with a manual refresh action.
 * @param records - Delivery records from browser storage
 * @param loaded - Whether localStorage has been read
 * @param onRecordsChange - Callback to persist updated records
 */
export const DeliveryStatusPanel = ({
  records,
  loaded,
  onRecordsChange,
}: DeliveryStatusPanelProps) => {
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<DeliveryRecord['status'] | 'all'>('all')

  const summary = useMemo(() => summarizeDeliveryRecords(records), [records])

  const handleCheck = async () => {
    setChecking(true)
    setMessage(null)

    try {
      const response = await fetch('/api/delivery-status/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      })
      const data = (await response.json()) as CheckDeliveryResponse & { error?: string }

      if (!response.ok) {
        setMessage(data.error ?? 'Check failed.')
        return
      }

      onRecordsChange(data.records)
      setMessage(data.message)
    } catch {
      setMessage('Network error while checking delivery status.')
    } finally {
      setChecking(false)
    }
  }

  const filtered = filter === 'all' ? records : records.filter((r) => r.status === filter)

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-6 shadow-card">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-parchment-50">Delivery Status</h2>
          <p className="mt-1 text-sm text-parchment-400">
            Track delivered, pending, and bounced emails. After sending, click refresh — valid
            addresses move to Delivered after 1 minute; invalid domains and bounces are detected
            automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCheck}
          disabled={checking || !loaded || records.length === 0}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium text-ink-950 transition',
            checking || !loaded || records.length === 0
              ? 'cursor-not-allowed bg-ember-500/40'
              : 'bg-ember-500 hover:bg-ember-400',
          )}
        >
          {checking ? 'Checking…' : 'Refresh status'}
        </button>
      </div>

      {loaded && records.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Delivered" count={summary.delivered} tone="emerald" />
          <SummaryCard label="Bounced" count={summary.bounced} tone="red" />
          <SummaryCard label="Pending" count={summary.pending} tone="amber" />
          <SummaryCard label="Failed" count={summary.failed} tone="slate" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'delivered', 'bounced', 'pending', 'failed'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              filter === status
                ? 'bg-ember-500 text-ink-950'
                : 'bg-white/5 text-parchment-300 hover:bg-white/10',
            )}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {message && (
        <p className="mb-4 rounded-xl bg-ember-500/10 px-3 py-2 text-sm text-ember-100">{message}</p>
      )}

      {!loaded ? (
        <p className="text-sm text-parchment-500">Loading delivery records…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-parchment-500">
          {records.length === 0
            ? 'No emails sent yet. Send a message above to start tracking.'
            : 'No records match this filter.'}
        </p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {filtered.map((record) => (
            <li
              key={record.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5"
            >
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  STATUS_STYLES[record.status],
                )}
              >
                {STATUS_LABELS[record.status]}
              </span>
              <code className="text-sm text-parchment-50">{record.recipient}</code>
              <span className="text-xs text-parchment-500">
                {new Date(record.sentAt).toLocaleString()}
              </span>
              {record.error && (
                <span className="w-full text-xs text-rose-200">{record.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface SummaryCardProps {
  label: string
  count: number
  tone: 'emerald' | 'red' | 'amber' | 'slate'
}

/**
 * Summary stat card for a delivery status category.
 * @param label - Display label
 * @param count - Number of records
 * @param tone - Color theme
 */
const SummaryCard = ({ label, count, tone }: SummaryCardProps) => {
  const tones = {
    emerald: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    red: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    amber: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    slate: 'border-white/10 bg-ink-950 text-parchment-300',
  }

  return (
    <div className={cn('rounded-xl border px-4 py-3', tones[tone])}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}
