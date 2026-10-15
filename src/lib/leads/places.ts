import {
  getGoogleApiKeys,
  isKeyExhaustedError,
  markKeyExhausted,
  rotateGoogleApiKeys,
} from '@/lib/leads/google-keys'
import { firstUsableEmail } from '@/lib/leads/usable-email'

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'nextPageToken',
].join(',')
const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'nationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  'rating',
  'userRatingCount',
].join(',')

export type MappedPlace = {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number: string
  website: string
  url: string
  rating: number
  reviews: number
}

type PlacesResult = {
  payload?: Record<string, unknown>
  error?: string
}

/**
 * Narrow unknown JSON to a plain object.
 * @param value - Parsed JSON
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Read a string field, or an empty string.
 * @param value - Unknown JSON value
 */
const textField = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Map a Places API (New) place into the CSV fields the finder expects.
 * @param place - Raw place object
 */
export const mapPlace = (place: Record<string, unknown>): MappedPlace => {
  const displayName = isRecord(place.displayName) ? textField(place.displayName.text) : ''
  const rating = typeof place.rating === 'number' ? place.rating : 0
  const reviews = typeof place.userRatingCount === 'number' ? place.userRatingCount : 0
  return {
    place_id: textField(place.id),
    name: displayName,
    formatted_address: textField(place.formattedAddress),
    formatted_phone_number: textField(place.nationalPhoneNumber),
    website: textField(place.websiteUri),
    url: textField(place.googleMapsUri),
    rating,
    reviews,
  }
}

/**
 * Return a readable error from a Places response, if present.
 * @param payload - Parsed Places JSON
 */
const getGoogleError = (payload: Record<string, unknown>): string => {
  if (!isRecord(payload.error)) return ''
  return textField(payload.error.message) || 'Google Places request failed'
}

/**
 * Whether a Google error is a daily or rate quota limit.
 * @param message - Error text
 */
const isQuotaError = (message: string): boolean => /quota exceeded/i.test(message)

/**
 * Call Places with one API key.
 * @param url - Places endpoint
 * @param options - Method, field mask, key, and optional JSON body
 */
const placesRequest = async (
  url: string,
  options: {
    method?: string
    fieldMask: string
    apiKey: string
    body?: Record<string, unknown>
  },
): Promise<Record<string, unknown>> => {
  const headers: Record<string, string> = {
    'X-Goog-Api-Key': options.apiKey,
    'X-Goog-FieldMask': options.fieldMask,
  }
  if (options.body) headers['Content-Type'] = 'application/json'

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(10000),
    })
    const raw = await response.text()
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? parsed : { error: { message: 'Invalid Places response' } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Places request failed'
    return { error: { message } }
  }
}

/**
 * Call Places, rotating keys when one is exhausted.
 * @param url - Places endpoint
 * @param options - Method, field mask, and optional body
 */
const placesRequestWithRotation = async (
  url: string,
  options: { method?: string; fieldMask: string; body?: Record<string, unknown> },
): Promise<PlacesResult> => {
  const keys = rotateGoogleApiKeys(getGoogleApiKeys())
  if (!keys.length) {
    return { error: 'Set GOOGLE_PLACES_API_KEYS before searching.' }
  }

  let lastError = ''
  for (const apiKey of keys) {
    const payload = await placesRequest(url, { ...options, apiKey })
    const googleError = getGoogleError(payload)
    if (!googleError) return { payload }

    lastError = googleError
    if (isKeyExhaustedError(googleError) || isQuotaError(googleError)) {
      markKeyExhausted(apiKey)
      continue
    }
    if (/timed out/i.test(googleError)) continue
    return { error: googleError }
  }

  return { error: lastError || 'All Google Places API keys failed' }
}

/**
 * Search Google Places text results, including an optional page token.
 * @param query - Text query such as "yoga studio Chicago"
 * @param pageToken - Token for the next page
 */
export const searchPlaces = async (query: string, pageToken?: string) => {
  const body = pageToken
    ? { textQuery: query, pageSize: 20, pageToken }
    : { textQuery: query, pageSize: 20 }
  const rotated = await placesRequestWithRotation(PLACES_SEARCH_URL, {
    method: 'POST',
    fieldMask: SEARCH_FIELD_MASK,
    body,
  })
  if (!rotated.payload) {
    return { success: false as const, error: rotated.error ?? 'Google Places search failed' }
  }

  const places = Array.isArray(rotated.payload.places) ? rotated.payload.places : []
  const results = places.filter(isRecord).map(mapPlace)
  const next = textField(rotated.payload.nextPageToken)
  return {
    success: true as const,
    data: {
      status: results.length ? 'OK' : 'ZERO_RESULTS',
      results,
      next_page_token: next || undefined,
    },
  }
}

/**
 * Load one place by id.
 * @param placeId - Google place id
 */
export const placeDetails = async (placeId: string) => {
  const rotated = await placesRequestWithRotation(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    { fieldMask: DETAILS_FIELD_MASK },
  )
  if (!rotated.payload) {
    return { success: false as const, error: rotated.error ?? 'Place details failed' }
  }
  return {
    success: true as const,
    data: { status: 'OK', result: mapPlace(rotated.payload) },
  }
}

/**
 * Fetch a page as text. Failures return an empty string.
 * @param url - Page URL
 */
const fetchPage = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    return await response.text()
  } catch {
    return ''
  }
}

/**
 * Scrape the first usable email from a homepage or contact page.
 * @param website - Business website URL
 */
export const scrapeEmailFromWebsite = async (website: string): Promise<string> => {
  if (!website) return ''
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
  const clean = (text: string) =>
    text
      .replace(/\[at\]/g, '@')
      .replace(/\(at\)/g, '@')
      .replace(/\[dot\]/g, '.')
      .replace(/\(dot\)/g, '.')

  const collected: string[] = []
  collected.push(...(clean(await fetchPage(website)).match(emailRegex) ?? []))
  for (const path of ['contact', 'contact-us', 'about']) {
    if (firstUsableEmail(collected)) break
    const subUrl = `${website.replace(/\/$/, '')}/${path}`
    collected.push(...(clean(await fetchPage(subUrl)).match(emailRegex) ?? []))
  }
  return firstUsableEmail(collected)
}
