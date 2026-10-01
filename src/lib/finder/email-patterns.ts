/**
 * Generates common email address patterns from a name and domain.
 * @param firstName - Person's first name
 * @param lastName - Person's last name
 * @param domain - Email domain
 */
export const generateEmailPatterns = (
  firstName: string,
  lastName: string,
  domain: string,
): string[] => {
  const first = firstName.trim().toLowerCase().replace(/[^a-z]/g, '')
  const last = lastName.trim().toLowerCase().replace(/[^a-z]/g, '')
  const f = first.charAt(0)
  const l = last.charAt(0)

  if (!first || !last || !domain) return []

  const patterns = [
    `${first}.${last}@${domain}`,
    `${first}${last}@${domain}`,
    `${f}.${last}@${domain}`,
    `${first}@${domain}`,
    `${last}.${first}@${domain}`,
    `${f}${last}@${domain}`,
    `${first}_${last}@${domain}`,
    `${first}-${last}@${domain}`,
    `${last}@${domain}`,
    `${first}${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${last}.${f}@${domain}`,
    `${last}${f}@${domain}`,
    `info@${domain}`,
    `contact@${domain}`,
    `hello@${domain}`,
    `admin@${domain}`,
  ]

  return [...new Set(patterns)]
}

/**
 * Checks if an email local part likely matches the given name.
 * @param email - Full email address
 * @param firstName - Person's first name
 * @param lastName - Person's last name
 */
export const emailMatchesName = (
  email: string,
  firstName: string,
  lastName: string,
): boolean => {
  const local = email.split('@')[0]?.toLowerCase() ?? ''
  const first = firstName.trim().toLowerCase().replace(/[^a-z]/g, '')
  const last = lastName.trim().toLowerCase().replace(/[^a-z]/g, '')
  const f = first.charAt(0)
  const l = last.charAt(0)

  if (!first || !last) return false

  const variants = [
    first,
    last,
    `${first}${last}`,
    `${first}.${last}`,
    `${f}${last}`,
    `${f}.${last}`,
    `${first}_${last}`,
    `${first}-${last}`,
    `${last}.${first}`,
    `${last}${first}`,
    `${first}${l}`,
    `${f}${l}`,
  ]

  return variants.some((variant) => local === variant || local.includes(variant))
}
