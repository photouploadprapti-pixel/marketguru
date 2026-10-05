'use client'

import { useState, type FormEvent } from 'react'
import Papa from 'papaparse'

import { actionCreateLead, actionDeleteLead, actionImportLeads, actionMoveLead } from '@/actions/action-pipeline'
import { cn } from '@/lib/cn'
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type Lead, type LeadStatus } from '@/types/pipeline'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-parchment-50 outline-none placeholder:text-parchment-500 focus:border-ember-400'

type PipelineBoardProps = {
  leads: Lead[]
  ephemeral: boolean
}

/**
 * Kanban board for moving leads through the outreach stages.
 * @param props - Saved leads and whether storage resets on the host
 */
export const PipelineBoard = ({ leads, ephemeral }: PipelineBoardProps) => {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    const result = await actionCreateLead(new FormData(event.currentTarget))
    setMessage(result.message)
    setPending(false)
    if (result.ok) event.currentTarget.reset()
  }

  const handleImport = async (file: File | null) => {
    if (!file) return
    setPending(true)
    const rows = await new Promise<Array<Record<string, string>>>((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => resolve(result.data),
        error: (error) => reject(error),
      })
    })
    const result = await actionImportLeads(rows)
    setMessage(result.message)
    setPending(false)
  }

  return (
    <div>
      {ephemeral ? (
        <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Leads on this deploy stay in memory until Turso is configured. Set TURSO_DATABASE_URL
          and TURSO_AUTH_TOKEN so the board survives a refresh.
        </p>
      ) : null}
      <form
        onSubmit={handleCreate}
        className="mb-4 grid gap-3 rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-4 md:grid-cols-6"
      >
        <input name="name" required placeholder="Name" className={inputClass} />
        <input name="email" required type="email" placeholder="Email" className={inputClass} />
        <input name="company" placeholder="Company" className={inputClass} />
        <input name="city" placeholder="City" className={inputClass} />
        <input name="phone" placeholder="Phone" className={inputClass} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-50"
        >
          Add lead
        </button>
        <label className="text-xs text-parchment-400 md:col-span-6">
          Import a Place Finder CSV
          <input
            type="file"
            accept=".csv"
            className="mt-1 block text-sm"
            onChange={(event) => {
              void handleImport(event.target.files?.[0] ?? null)
            }}
          />
        </label>
      </form>
      {message ? <p className="mb-4 text-sm text-parchment-300">{message}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {LEAD_STATUSES.map((status) => (
          <section
            key={status}
            className="w-64 shrink-0 rounded-[1.5rem] border border-white/10 bg-ink-950/60 p-3"
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-parchment-50">{LEAD_STATUS_LABELS[status]}</h2>
              <span className="text-xs text-parchment-500">
                {leads.filter((lead) => lead.status === status).length}
              </span>
            </header>
            <div className="space-y-2">
              {leads.filter((lead) => lead.status === status).map((lead) => (
                <LeadCard key={lead.id} lead={lead} onMessage={setMessage} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

type LeadCardProps = {
  lead: Lead
  onMessage: (message: string) => void
}

/**
 * One lead card with a stage picker.
 * @param props - Lead and a status message callback
 */
const LeadCard = ({ lead, onMessage }: LeadCardProps) => {
  const move = async (status: LeadStatus) => {
    const result = await actionMoveLead(lead.id, status)
    onMessage(result.message)
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-ink-900 p-3">
      <p className="font-medium text-parchment-50">{lead.name}</p>
      <p className="truncate text-xs text-parchment-400">{lead.email}</p>
      {lead.company ? <p className="mt-1 text-xs text-parchment-500">{lead.company}</p> : null}
      {lead.city ? <p className="text-xs text-parchment-500">{lead.city}</p> : null}
      <select
        value={lead.status}
        onChange={(event) => {
          const next = event.target.value
          if (next === 'new' || next === 'contacted' || next === 'replied' || next === 'qualified' || next === 'closed_won') {
            void move(next)
          }
        }}
        className={cn(inputClass, 'mt-3')}
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>{LEAD_STATUS_LABELS[status]}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          void actionDeleteLead(lead.id).then((result) => onMessage(result.message))
        }}
        className="mt-2 text-xs text-parchment-500 hover:text-rose-300"
      >
        Remove
      </button>
    </article>
  )
}
