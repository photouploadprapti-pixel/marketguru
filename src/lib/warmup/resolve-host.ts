import { promises as dns } from 'dns'
import net from 'net'

import { sleep } from '@/lib/cn'

/**
 * Read an error code from a DNS failure.
 * @param error - Thrown lookup error
 */
const errorCode = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code
    return typeof code === 'string' ? code : ''
  }
  return ''
}

/**
 * Whether another attempt might succeed.
 * @param code - DNS error code
 */
const canRetry = (code: string): boolean =>
  code === 'EBUSY' || code === 'EAI_AGAIN' || code === 'ETIMEOUT' || code === 'ESERVFAIL'

/**
 * Resolve one mail host to an IP.
 * Vercel's getaddrinfo call returns EBUSY, so prefer a direct DNS query and retry.
 * @param hostname - SMTP or IMAP host
 */
export const resolveMailHost = async (hostname: string): Promise<string> => {
  const host = hostname.trim()
  if (net.isIP(host)) return host

  let last: unknown
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const addresses = await dns.resolve4(host)
      const found = addresses[0]
      if (found) return found
    } catch (error) {
      last = error
    }

    try {
      const found = await dns.lookup(host)
      if (found.address) return found.address
    } catch (error) {
      last = error
      if (!canRetry(errorCode(error))) break
    }

    if (attempt < 3) await sleep(300 * (attempt + 1))
  }

  const detail = last instanceof Error ? last.message : 'DNS lookup failed'
  throw new Error(`Could not resolve ${host}. ${detail}`)
}
