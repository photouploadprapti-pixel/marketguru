import { normalizeDomain } from '@/lib/finder/domain'
import { emailMatchesName } from '@/lib/finder/email-patterns'

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

const SCRAPE_PATHS = ['', '/contact', '/about', '/team', '/about-us', '/contact-us']

const FETCH_TIMEOUT_MS = 8000

/**
 * Fetches page HTML with a timeout.
 * @param url - URL to fetch
 */
const fetchPage = async (url: string): Promise<string | null> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AdminFinder/1.0 (email discovery tool)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Extracts unique email addresses from HTML content.
 * @param html - Page HTML
 */
const extractEmails = (html: string): string[] => {
  const matches = html.match(EMAIL_REGEX) ?? []
  const cleaned = matches.map((email) =>
    email
      .toLowerCase()
      .replace(/[),;]+$/, '')
      .replace(/^mailto:/, ''),
  )
  return [...new Set(cleaned)]
}

export interface ScrapedEmail {
  email: string
  source: string
}

/**
 * Scrapes a website for emails matching a person's name.
 * @param domainInput - Domain or URL
 * @param firstName - Person's first name
 * @param lastName - Person's last name
 */
export const scrapeEmailsFromWebsite = async (
  domainInput: string,
  firstName: string,
  lastName: string,
): Promise<{ domain: string; emails: ScrapedEmail[]; allDomainEmails: string[] }> => {
  const domain = normalizeDomain(domainInput)
  const allFound: ScrapedEmail[] = []
  const allDomainEmails = new Set<string>()

  for (const path of SCRAPE_PATHS) {
    const url = `https://${domain}${path}`
    const html = await fetchPage(url)
    if (!html) continue

    const emails = extractEmails(html)
    for (const email of emails) {
      const emailDomain = email.split('@')[1]
      if (emailDomain !== domain && !emailDomain?.endsWith(`.${domain}`)) continue

      allDomainEmails.add(email)

      if (emailMatchesName(email, firstName, lastName)) {
        allFound.push({ email, source: url })
      }
    }
  }

  const unique = new Map<string, ScrapedEmail>()
  for (const item of allFound) {
    if (!unique.has(item.email)) unique.set(item.email, item)
  }

  return {
    domain,
    emails: [...unique.values()],
    allDomainEmails: [...allDomainEmails],
  }
}
