import { NextResponse } from 'next/server'

import { hasMxRecords, normalizeDomain } from '@/lib/finder/domain'
import { generateEmailPatterns } from '@/lib/finder/email-patterns'
import { scrapeEmailsFromWebsite } from '@/lib/finder/email-scraper'
import type { EmailResult, FindEmailRequest, FindEmailResponse } from '@/types/email'

/**
 * POST /api/find-email — discovers verified and suggested emails for a person at a domain.
 */
export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as FindEmailRequest
    const { domain, firstName, lastName } = body

    if (!domain?.trim() || !firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'Domain, first name, and last name are required.' },
        { status: 400 },
      )
    }

    const mxValid = await hasMxRecords(normalizeDomain(domain))

    const { domain: normalizedDomain, emails: scraped } = await scrapeEmailsFromWebsite(
      domain,
      firstName,
      lastName,
    )

    const verified: EmailResult[] = scraped.map(({ email, source }) => ({
      email,
      type: 'verified',
      source,
    }))

    const verifiedSet = new Set(verified.map((v) => v.email))
    const patterns = generateEmailPatterns(firstName, lastName, normalizedDomain)

    const suggested: EmailResult[] = patterns
      .filter((email) => !verifiedSet.has(email))
      .map((email) => ({ email, type: 'suggested' as const }))

    const response: FindEmailResponse = {
      results: [...verified, ...suggested],
      domain: normalizedDomain,
      hasMxRecords: mxValid,
    }

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to find emails.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
