'use client'

import { useState } from 'react'
import Papa from 'papaparse'

import { actionSaveContacts } from '@/actions/action-contacts'
import { cleanLeadRows, rowEmail, type CsvRow } from '@/lib/leads/clean-list'
import { downloadCsv } from '@/lib/leads/csv'

const inputClass =
  'block w-full text-sm text-parchment-300'

/**
 * Parse a CSV file into header-keyed rows.
 * @param file - Uploaded CSV
 */
const readCsv = (file: File): Promise<CsvRow[]> =>
  new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    })
  })

/**
 * Drop empty, generic, and duplicate emails, then download or save the rest.
 */
export const CsvCleaner = () => {
  const [file, setFile] = useState<File | null>(null)
  const [kept, setKept] = useState<CsvRow[]>([])
  const [removed, setRemoved] = useState<{ email: string; reason: string }[]>([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const onClean = async () => {
    if (!file) return
    setBusy(true)
    setNotice('')
    try {
      const rows = await readCsv(file)
      const result = cleanLeadRows(rows)
      setKept(result.kept)
      setRemoved(result.removed.map((item) => ({
        email: item.email || rowEmail(item.row) || '(blank)',
        reason: item.reason,
      })))
      setNotice(
        `Kept ${result.kept.length}. Removed ${result.removed.length} empty, generic, or duplicate rows.`,
      )
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not read the CSV.')
    } finally {
      setBusy(false)
    }
  }

  const onDownload = () => {
    if (!kept.length) return
    const headers = Object.keys(kept[0] ?? {})
    downloadCsv(
      [headers, ...kept.map((row) => headers.map((header) => row[header] ?? ''))],
      'cleaned-contacts.csv',
    )
  }

  const onSave = async () => {
    const drafts = kept.map((row) => ({
      name: row.Name || row['Center Name'] || '',
      email: row.Email || '',
      phone: row.Phone || '',
      website: row.Website || '',
      city: row['City Input'] || row.City || '',
      company: row.Name || '',
      source: 'clean' as const,
    }))
    const result = await actionSaveContacts(drafts)
    setNotice(result.message)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-6">
        <p className="text-sm text-parchment-300">
          Empty emails and generic addresses such as admin@domain.com are removed. A real
          person&apos;s address stays in the file.
        </p>
        <input
          type="file"
          accept=".csv"
          className={`${inputClass} mt-4`}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={!file || busy}
          onClick={onClean}
          className="mt-4 rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-50"
        >
          {busy ? 'Cleaning...' : 'Clean CSV'}
        </button>
        {notice ? <p className="mt-4 text-sm text-ember-200">{notice}</p> : null}
        {kept.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-ink-950"
            >
              Download cleaned CSV
            </button>
            <button
              type="button"
              onClick={onSave}
              className="rounded-full bg-white/10 px-4 py-2 text-sm text-parchment-50"
            >
              Save as contacts
            </button>
          </div>
        ) : null}
      </section>

      {removed.length ? (
        <section className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink-800 text-parchment-400">
              <tr>
                <th className="px-3 py-2 font-medium">Removed</th>
                <th className="px-3 py-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {removed.slice(0, 40).map((item, index) => (
                <tr key={`${item.email}-${index}`} className="border-t border-white/5">
                  <td className="px-3 py-2 text-parchment-200">{item.email}</td>
                  <td className="px-3 py-2 text-parchment-400">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  )
}
