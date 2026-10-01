/**
 * Normalizes a domain input into a clean hostname.
 * @param input - Raw domain or URL string
 */
export const normalizeDomain = (input: string): string => {
  let domain = input.trim().toLowerCase()
  domain = domain.replace(/^https?:\/\//, '')
  domain = domain.replace(/^www\./, '')
  domain = domain.split('/')[0]?.split('?')[0] ?? domain
  return domain
}

/**
 * Checks whether a domain has MX records for email delivery.
 * @param domain - Normalized domain hostname
 */
export const hasMxRecords = async (domain: string): Promise<boolean> => {
  try {
    const dns = await import('dns/promises')
    const records = await dns.resolveMx(domain)
    return records.length > 0
  } catch {
    return false
  }
}
