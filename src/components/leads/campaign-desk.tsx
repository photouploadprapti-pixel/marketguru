'use client'

import { useState, type FormEvent } from 'react'
import Papa from 'papaparse'

import { PageIntro } from '@/components/page-intro'
import { actionSaveCampaignReport } from '@/actions/action-marketing'
import { actionSuppressEmails } from '@/actions/action-contacts'
import { cn } from '@/lib/cn'
import { downloadCsv, fillTemplate, parseRowIndices } from '@/lib/leads/csv'
import { isUsableEmail } from '@/lib/leads/usable-email'
import type { ContactList, MailTemplate, SavedContact } from '@/types/marketing'

type LeadRow = Record<string, string>

const inputClass =
  'w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-parchment-50 outline-none placeholder:text-parchment-500 focus:border-ember-400'

const DEFAULT_BODY = `<p>Namaste {Name} team,</p>
<p>We frequently speak with independent yoga studios that want to offer high-ticket Pilates options but are stopped by the complexity and cost of buying Reformers and hiring instructors for every session.</p>
<p>Starka solves this by providing a high-end machine with an interactive smart kiosk. It delivers personalized, on-screen guided sessions, meaning your clients get a premium experience with zero staffing overhead required from you.</p>
<p>Gracefully,<br><br><strong>Shiv @ Starka</strong></p>`

/**
 * Parse a CSV file into header-keyed rows.
 * @param file - Uploaded CSV
 */
const readCsv = (file: File): Promise<LeadRow[]> =>
  new Promise((resolve, reject) => {
    Papa.parse<LeadRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    })
  })

type CampaignDeskProps = {
  templates: MailTemplate[]
  lists: ContactList[]
  contacts: SavedContact[]
}

/**
 * CSV campaign sender and bounce matcher from the Places toolkit.
 * @param props - Saved templates, lists, and contacts
 */
export const CampaignDesk = ({ templates, lists, contacts }: CampaignDeskProps) => {
  const [tab, setTab] = useState<'send' | 'bounces'>('send')

  return (
    <div>
      <PageIntro
        kicker="Campaign"
        title="Send and check bounces"
        description="Send HTML mail from a CSV or a saved list. Blocked and generic addresses are skipped, and the result is saved as a report."
      />
      <div className="mb-6 flex gap-2">
        {([
          ['send', 'Send emails'],
          ['bounces', 'Failed emails'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm',
              tab === id ? 'bg-ember-500 text-ink-950' : 'bg-white/5 text-parchment-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'send' ? (
        <SendPanel templates={templates} lists={lists} contacts={contacts} />
      ) : (
        <BouncePanel />
      )}
    </div>
  )
}

/**
 * Bulk HTML sender that posts one message at a time.
 * @param props - Templates, lists, and contacts the sender can use
 */
const SendPanel = ({ templates, lists, contacts }: CampaignDeskProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [listId, setListId] = useState('')
  const [range, setRange] = useState('1-10')
  const [subject, setSubject] = useState(
    'Adding a premium Pilates channel to {Name} (Zero extra staff needed)',
  )
  const [body, setBody] = useState(DEFAULT_BODY)
  const [host, setHost] = useState('')
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [delayMs, setDelayMs] = useState('30000')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const pushLog = (message: string) => {
    setLog((current) => [...current, message])
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file && !listId) {
      pushLog('Choose a saved list or a CSV file.')
      return
    }
    setRunning(true)
    setLog(['Preparing recipients...'])

    try {
      const listed: LeadRow[] = contacts
        .filter((contact) => contact.listIds.includes(listId))
        .map((contact) => ({
          Name: contact.name || contact.company || 'Partner',
          Email: contact.email,
          City: contact.city,
          'City Input': contact.city,
          Phone: contact.phone,
          Website: contact.website,
        }))
      const data: LeadRow[] = listId ? listed : await readCsv(file as File)
      pushLog(`Loaded ${data.length} rows.`)
      const selected = parseRowIndices(range, data.length)
      if (!selected.length) {
        pushLog('No valid row indices selected.')
        return
      }
      const confirmed = window.confirm(`Send emails to ${selected.length} records?`)
      if (!confirmed) return

      const wait = Number.parseInt(delayMs, 10) || 30000
      let successCount = 0
      let failCount = 0
      let skipCount = 0
      const recipients: string[] = []

      for (let index = 0; index < selected.length; index += 1) {
        const rowIndex = selected[index] ?? 0
        const row = data[rowIndex] ?? {}
        const recipient = row.Email
        const name = row.Name || row['Center Name'] || 'Partner'
        if (!recipient || !isUsableEmail(recipient)) {
          pushLog(`[Row ${rowIndex + 1}] Skipped: empty or generic email for ${name}`)
          skipCount += 1
          continue
        }

        pushLog(`[Row ${rowIndex + 1}] Sending to ${name} (${recipient})...`)
        let sentThis = false
        try {
          const response = await fetch('/api/campaign/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              host,
              user,
              password,
              fromName: 'Shiv @ Starka',
              to: recipient,
              subject: fillTemplate(subject, row),
              body: fillTemplate(body, row),
            }),
          })
          const result = (await response.json()) as {
            success?: boolean
            error?: string
            suppressed?: boolean
          }
          if (result.suppressed) {
            pushLog(`[skip] ${result.error ?? 'Blocked.'}`)
            skipCount += 1
          } else if (response.ok && result.success) {
            pushLog('[ok] Sent.')
            successCount += 1
            recipients.push(recipient)
            sentThis = true
          } else {
            pushLog(`[x] Failed: ${result.error ?? 'Unknown error'}`)
            failCount += 1
            sentThis = true
          }
        } catch (error) {
          pushLog(`[x] ${error instanceof Error ? error.message : 'Request failed'}`)
          failCount += 1
          sentThis = true
        }

        if (sentThis && index < selected.length - 1) {
          pushLog(`Waiting ${wait / 1000}s before the next email...`)
          await new Promise((resolve) => {
            setTimeout(resolve, wait)
          })
        }
      }

      const report = await actionSaveCampaignReport({
        name: listId ? (lists.find((item) => item.id === listId)?.name ?? 'List') : 'CSV campaign',
        sent: successCount,
        failed: failCount,
        skipped: skipCount,
        recipients,
      })
      pushLog(
        `Completed. Sent: ${successCount}, Failed: ${failCount}, Skipped: ${skipCount}. ${report.message}`,
      )
    } catch (error) {
      pushLog(error instanceof Error ? error.message : 'Could not read the CSV.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-6 shadow-card"
    >
      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-medium text-parchment-100">Saved list</span>
        <select
          className={inputClass}
          value={listId}
          onChange={(event) => setListId(event.target.value)}
        >
          <option value="">Use a CSV instead</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name} ({contacts.filter((item) => item.listIds.includes(list.id)).length})
            </option>
          ))}
        </select>
      </label>
      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-medium text-parchment-100">Saved template</span>
        <select
          className={inputClass}
          defaultValue=""
          onChange={(event) => {
            const template = templates.find((item) => item.id === event.target.value)
            if (!template) return
            setSubject(template.subject)
            setBody(template.body)
          }}
        >
          <option value="">Keep the subject and body below</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </label>
      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-medium text-parchment-100">CSV from Place Finder</span>
        <input
          type="file"
          accept=".csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-parchment-300"
        />
      </label>
      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-medium text-parchment-100">Row index range</span>
        <input className={inputClass} value={range} onChange={(event) => setRange(event.target.value)} required />
        <span className="mt-1 block text-xs text-parchment-500">
          Row 1 is the first data row. Use 1-10 or 1,3,5.
        </span>
      </label>
      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-medium text-parchment-100">Subject template</span>
        <input className={inputClass} value={subject} onChange={(event) => setSubject(event.target.value)} required />
      </label>
      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-medium text-parchment-100">HTML body template</span>
        <textarea
          className={`${inputClass} min-h-48`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
        />
        <span className="mt-1 block text-xs text-parchment-500">
          Use {'{Name}'} or any CSV column name in braces.
        </span>
      </label>
      <fieldset className="mb-5 grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2">
        <legend className="px-1 text-xs tracking-[0.14em] text-parchment-500 uppercase">SMTP</legend>
        <input className={inputClass} placeholder="SMTP host" value={host} onChange={(event) => setHost(event.target.value)} required />
        <input className={inputClass} placeholder="Email username" value={user} onChange={(event) => setUser(event.target.value)} required />
        <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <input className={inputClass} type="number" min={0} placeholder="Delay (ms)" value={delayMs} onChange={(event) => setDelayMs(event.target.value)} />
      </fieldset>
      <button
        type="submit"
        disabled={running}
        className="rounded-full bg-ember-500 px-5 py-2.5 text-sm font-medium text-ink-950 disabled:opacity-50"
      >
        {running ? 'Sending...' : 'Start sending'}
      </button>
      {log.length ? (
        <pre className="mt-4 max-h-52 overflow-auto rounded-2xl bg-ink-950 p-3 text-xs whitespace-pre-wrap text-parchment-300">
          {log.join('\n')}
        </pre>
      ) : null}
    </form>
  )
}

/**
 * Match inbox bounces against an uploaded lead CSV.
 */
const BouncePanel = () => {
  const [file, setFile] = useState<File | null>(null)
  const [host, setHost] = useState('')
  const [port, setPort] = useState('993')
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [matched, setMatched] = useState<LeadRow[]>([])

  const pushLog = (message: string) => {
    setLog((current) => [...current, message])
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) return
    setRunning(true)
    setMatched([])
    setLog(['Parsing original CSV...'])

    try {
      const data = await readCsv(file)
      pushLog(`Loaded ${data.length} records.`)
      if (data.length && !Object.prototype.hasOwnProperty.call(data[0], 'Email')) {
        pushLog("The CSV needs an Email column.")
        return
      }

      pushLog('Scanning the mailbox for bounces...')
      const response = await fetch('/api/campaign/bounces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: Number.parseInt(port, 10) || 993,
          user,
          password,
        }),
      })
      const result = (await response.json()) as {
        success?: boolean
        error?: string
        failed_emails?: string[]
      }
      if (!response.ok || !result.success) {
        pushLog(result.error ?? 'Bounce scan failed.')
        return
      }

      const failed = new Set((result.failed_emails ?? []).map((email) => email.toLowerCase().trim()))
      if (!failed.size) {
        pushLog('No delivery failure logs matched inside the inbox.')
        return
      }

      const hits = data.filter((row) => failed.has((row.Email ?? '').toLowerCase().trim()))
      pushLog(`Matched ${hits.length} failed delivery records.`)
      const blocked = await actionSuppressEmails([...failed], 'bounce')
      pushLog(blocked.message)
      setMatched(hits)
    } catch (error) {
      pushLog(error instanceof Error ? error.message : 'Scan failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-6 shadow-card"
    >
      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-medium text-parchment-100">Original CSV</span>
        <input
          type="file"
          accept=".csv"
          required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-parchment-300"
        />
      </label>
      <fieldset className="mb-5 grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2">
        <legend className="px-1 text-xs tracking-[0.14em] text-parchment-500 uppercase">IMAP</legend>
        <input className={inputClass} placeholder="IMAP host" value={host} onChange={(event) => setHost(event.target.value)} required />
        <input className={inputClass} type="number" placeholder="Port" value={port} onChange={(event) => setPort(event.target.value)} />
        <input className={inputClass} placeholder="Email username" value={user} onChange={(event) => setUser(event.target.value)} required />
        <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </fieldset>
      <button
        type="submit"
        disabled={running}
        className="rounded-full bg-ember-500 px-5 py-2.5 text-sm font-medium text-ink-950 disabled:opacity-50"
      >
        {running ? 'Scanning...' : 'Scan mailbox'}
      </button>
      {log.length ? (
        <pre className="mt-4 max-h-52 overflow-auto rounded-2xl bg-ink-950 p-3 text-xs whitespace-pre-wrap text-parchment-300">
          {log.join('\n')}
        </pre>
      ) : null}
      {matched.length ? (
        <button
          type="button"
          onClick={() => {
            const headers = Object.keys(matched[0] ?? {})
            downloadCsv(
              [headers, ...matched.map((row) => headers.map((header) => row[header] ?? ''))],
              'failed_deliveries_detailed.csv',
            )
          }}
          className="mt-4 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-ink-950"
        >
          Download {matched.length} bounced rows
        </button>
      ) : null}
    </form>
  )
}
