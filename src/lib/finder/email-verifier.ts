import { hasMxRecords } from '@/lib/finder/domain'

/**
 * Extracts the domain portion from an email address.
 * @param email - Full email address
 */
export const getEmailDomain = (email: string): string | null => {
  const domain = email.split('@')[1]?.trim().toLowerCase()
  return domain || null
}

/**
 * Checks whether an email address domain can receive mail (has MX records).
 * @param email - Recipient email address
 */
export const canReceiveMail = async (email: string): Promise<boolean> => {
  const domain = getEmailDomain(email)
  if (!domain) return false
  return hasMxRecords(domain)
}

/**
 * Returns a human-readable reason when a domain cannot receive mail.
 * @param email - Recipient email address
 */
export const getUndeliverableReason = async (email: string): Promise<string | null> => {
  const domain = getEmailDomain(email)
  if (!domain) return 'Invalid email address format'

  const canReceive = await hasMxRecords(domain)
  if (!canReceive) {
    return `Domain "${domain}" has no mail server (no MX records) — email cannot be delivered`
  }

  return null
}
