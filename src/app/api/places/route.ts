import { NextResponse } from 'next/server'

import { placeDetails, scrapeEmailFromWebsite, searchPlaces } from '@/lib/leads/places'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Narrow a request body to a record.
 * @param value - Parsed JSON
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Google Places search, details, and website email scrape.
 */
export const POST = async (request: Request) => {
  try {
    const parsed: unknown = await request.json()
    if (!isRecord(parsed)) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
    }

    const action = typeof parsed.action === 'string' ? parsed.action : ''

    if (action === 'search') {
      const query = typeof parsed.query === 'string' ? parsed.query : ''
      const pageToken = typeof parsed.pagetoken === 'string' ? parsed.pagetoken : undefined
      const result = await searchPlaces(query, pageToken)
      return NextResponse.json(result)
    }

    if (action === 'details') {
      const placeId = typeof parsed.placeId === 'string' ? parsed.placeId : ''
      const result = await placeDetails(placeId)
      return NextResponse.json(result)
    }

    if (action === 'scrapeEmail') {
      const website = typeof parsed.website === 'string' ? parsed.website : ''
      const email = await scrapeEmailFromWebsite(website)
      return NextResponse.json({ success: true, email })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Places request failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
