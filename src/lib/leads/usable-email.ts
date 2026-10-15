const PLACEHOLDER_EMAILS = new Set([
  'example@domain.com',
  'name@domain.com',
  'email@domain.com',
  'user@domain.com',
  'test@example.com',
  'example@example.com',
])

const ROLE_LOCALS = new Set([
  'admin',
  'info',
  'contact',
  'contacts',
  'sales',
  'hello',
  'support',
  'webmaster',
  'noreply',
  'no-reply',
  'office',
  'mail',
  'team',
  'enquiry',
  'enquiries',
  'postmaster',
  'abuse',
  'example',
  'name',
  'user',
  'email',
  'test',
])

/**
 * Why an address should be dropped, or an empty string when it can be kept.
 * @param email - Candidate address
 */
export const emailRejectReason = (email: string): string => {
  const value = String(email || '').trim().toLowerCase()
  if (!value) return 'empty'
  const at = value.indexOf('@')
  if (at <= 0 || at !== value.lastIndexOf('@')) return 'not an email'
  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return 'not an email'
  }
  if (ROLE_LOCALS.has(local) || PLACEHOLDER_EMAILS.has(value)) return 'generic role address'
  if (/@(example|domain|email|test)\./i.test(value)) return 'placeholder domain'
  if (/\.(png|gif|jpe?g|webp|svg|ico)(\?|$)/i.test(value)) return 'image file'
  return ''
}

/**
 * Return true when an address looks like a real contact email.
 * @param email - Candidate address
 */
export const isUsableEmail = (email: string): boolean => emailRejectReason(email) === ''

/**
 * Pick the first usable email from a list of matches.
 * @param matches - Addresses scraped from a page
 */
export const firstUsableEmail = (matches: string[]): string => {
  const found = matches.find((item) => isUsableEmail(item))
  return found ?? ''
}

/**
 * Guess a person's name from a first.last local part.
 * @param email - Usable contact address
 */
export const guessOwnerName = (email: string): string => {
  const local = email.split('@')[0]?.toLowerCase() ?? ''
  const parts = local.split(/[._]/).filter((part) => /^[a-z]{2,}$/.test(part))
  if (parts.length < 2 || parts.length > 3) return ''
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
