'use client'

import { useState, type FormEvent } from 'react'

import { actionSaveContacts } from '@/actions/action-contacts'
import { PageIntro } from '@/components/page-intro'
import { downloadCsv } from '@/lib/leads/csv'
import { guessOwnerName, isUsableEmail } from '@/lib/leads/usable-email'
import type { MappedPlace } from '@/lib/leads/places'

type LeadRow = {
  name: string
  owner: string
  email: string
  phone: string
  website: string
  address: string
  maps: string
  city: string
  rating: number
  reviews: number
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-parchment-50 outline-none placeholder:text-parchment-500 focus:border-ember-400'

/**
 * Whether a Places error is a quota limit.
 * @param message - Error text
 */
const isQuotaError = (message: string): boolean => /quota exceeded/i.test(message)

/**
 * Google Places lead search, email scrape, and CSV download.
 */
export const PlaceFinder = () => {
  const [cities, setCities] = useState('')
  const [placeType, setPlaceType] = useState('')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [rows, setRows] = useState<LeadRow[]>([])
  const [notice, setNotice] = useState('')

  const pushLog = (message: string) => {
    setLog((current) => [...current, message])
  }

  const searchPage = async (city: string, type: string, pageToken?: string) => {
    const response = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        query: `${type} ${city}`,
        pagetoken: pageToken,
      }),
    })
    const raw = await response.text()
    try {
      return JSON.parse(raw) as {
        success?: boolean
        error?: string
        data?: { results?: MappedPlace[]; next_page_token?: string }
      }
    } catch {
      throw new Error(raw.replace(/\s+/g, ' ').slice(0, 160))
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setRunning(true)
    setLog([])
    setRows([])
    pushLog('Starting data extraction...')

    const cityList = cities.split(',').map((city) => city.trim()).filter(Boolean)
    const seen = new Set<string>()
    const collected: LeadRow[] = []

    try {
      for (const city of cityList) {
        pushLog(`Searching for listings in ${city}`)
        const places: MappedPlace[] = []
        let pageToken: string | undefined
        let quotaExceeded = false

        for (let page = 0; page < 3; page += 1) {
          const json = await searchPage(city, placeType, pageToken)
          if (!json.success) {
            const error = json.error ?? 'Unknown error'
            pushLog(`Search error for ${city}: ${error}`)
            quotaExceeded = isQuotaError(error)
            break
          }
          places.push(...(json.data?.results ?? []))
          if (!json.data?.next_page_token) break
          pushLog(`Fetching extra Google page ${page + 2} for ${city}...`)
          await new Promise((resolve) => {
            setTimeout(resolve, 1200)
          })
          pageToken = json.data.next_page_token
        }

        pushLog(`Found ${places.length} Google listings in ${city}.`)
        if (quotaExceeded || !places.length) continue

        for (const place of places) {
          if (!place.place_id || seen.has(place.place_id)) continue
          seen.add(place.place_id)

          let current = place
          if (!current.name && !current.website) {
            const detailsResponse = await fetch('/api/places', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'details', placeId: place.place_id }),
            })
            const details = (await detailsResponse.json()) as {
              data?: { result?: MappedPlace }
            }
            current = details.data?.result ?? current
          }

          pushLog(`Processing: ${current.name || current.place_id}`)
          const emailResponse = await fetch('/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'scrapeEmail', website: current.website }),
          })
          const emailJson = (await emailResponse.json()) as { email?: string }
          const email = emailJson.email ?? ''
          if (!isUsableEmail(email)) {
            pushLog(`Skipped ${current.name || current.place_id}: no usable email.`)
            continue
          }

          collected.push({
            name: current.name,
            owner: guessOwnerName(email),
            email,
            phone: current.formatted_phone_number,
            website: current.website,
            address: current.formatted_address,
            maps: current.url,
            city,
            rating: current.rating ?? 0,
            reviews: current.reviews ?? 0,
          })
          setRows([...collected])
          await new Promise((resolve) => {
            setTimeout(resolve, 200)
          })
        }
      }

      if (collected.length) {
        pushLog('Finished. CSV is ready to download.')
      } else {
        pushLog('No listings with a usable email.')
      }
    } catch (error) {
      pushLog(error instanceof Error ? error.message : 'Search failed.')
    } finally {
      setRunning(false)
    }
  }

  const handleDownload = () => {
    const filename = `${placeType.trim().replace(/\s+/g, '_') || 'leads'}_leads.csv`
    downloadCsv(
      [
        ['Name', 'Owner', 'Email', 'Phone', 'Website', 'Address', 'More Info', 'City Input', 'Rating', 'Reviews'],
        ...rows.map((row) => [
          row.name,
          row.owner,
          row.email,
          row.phone,
          row.website,
          row.address,
          row.maps,
          row.city,
          String(row.rating || ''),
          String(row.reviews || ''),
        ]),
      ],
      filename,
    )
  }

  const handleSave = async () => {
    const result = await actionSaveContacts(rows.map((row) => ({
      name: row.owner || row.name,
      company: row.name,
      email: row.email,
      phone: row.phone,
      website: row.website,
      city: row.city,
      rating: row.rating,
      reviews: row.reviews,
      source: 'places' as const,
    })))
    setNotice(result.message)
  }

  return (
    <div>
      <PageIntro
        kicker="Places"
        title="Place Finder"
        description="Search Google Places by city and business type, scrape a contact email from each website, and download the leads as CSV."
      />
      <form
        onSubmit={handleSubmit}
        className="max-w-xl rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-6 shadow-card"
      >
        <label className="mb-4 block text-sm">
          <span className="mb-1.5 block font-medium text-parchment-100">Cities</span>
          <input
            className={inputClass}
            value={cities}
            onChange={(event) => setCities(event.target.value)}
            placeholder="New York, Los Angeles, Chicago"
            required
          />
          <span className="mt-1 block text-xs text-parchment-500">
            Separate cities with commas. Search uses Google Places only.
          </span>
        </label>
        <label className="mb-5 block text-sm">
          <span className="mb-1.5 block font-medium text-parchment-100">Place type</span>
          <input
            className={inputClass}
            value={placeType}
            onChange={(event) => setPlaceType(event.target.value)}
            placeholder="Yoga Studio, Hospital, Cafe"
            required
          />
        </label>
        <button
          type="submit"
          disabled={running}
          className="rounded-full bg-ember-500 px-5 py-2.5 text-sm font-medium text-ink-950 disabled:opacity-50"
        >
          {running ? 'Searching...' : 'Find leads'}
        </button>
      </form>

      {log.length ? (
        <pre className="mt-6 max-h-48 overflow-auto rounded-2xl border border-white/10 bg-ink-950 p-4 text-xs whitespace-pre-wrap text-parchment-300">
          {log.join('\n')}
        </pre>
      ) : null}

      {rows.length ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-parchment-300">{rows.length} leads with an email</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-ink-950"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-white/10 px-4 py-2 text-sm text-parchment-50"
              >
                Save as contacts
              </button>
            </div>
          </div>
          {notice ? <p className="mb-3 text-sm text-ember-200">{notice}</p> : null}
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ink-800 text-parchment-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Rating</th>
                  <th className="px-3 py-2 font-medium">City</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.email}-${row.name}`} className="border-t border-white/5">
                    <td className="px-3 py-2 text-parchment-50">{row.name}</td>
                    <td className="px-3 py-2 text-parchment-300">{row.owner}</td>
                    <td className="px-3 py-2 text-parchment-300">{row.email}</td>
                    <td className="px-3 py-2 text-parchment-300">
                      {row.rating ? `${row.rating} (${row.reviews})` : '—'}
                    </td>
                    <td className="px-3 py-2 text-parchment-300">{row.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
