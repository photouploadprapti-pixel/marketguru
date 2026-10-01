const exhaustedUntil = new Map<string, number>()
const EXHAUSTED_MS = 15 * 60 * 1000

/**
 * Unique Google Places keys from the environment.
 */
export const getGoogleApiKeys = (): string[] => {
  const raw = [
    process.env.GOOGLE_PLACES_API_KEY,
    ...(process.env.GOOGLE_PLACES_API_KEYS ?? '').split(','),
  ]
  const unique: string[] = []
  for (const key of raw) {
    const value = (key ?? '').trim()
    if (value && !unique.includes(value)) unique.push(value)
  }
  return unique
}

/**
 * Mark a key as unusable for a short period after quota or expiry.
 * @param apiKey - Key that Google rejected
 */
export const markKeyExhausted = (apiKey: string): void => {
  exhaustedUntil.set(apiKey, Date.now() + EXHAUSTED_MS)
}

/**
 * Whether this key was recently marked exhausted.
 * @param apiKey - Key to check
 */
const isKeyCoolingDown = (apiKey: string): boolean => {
  const until = exhaustedUntil.get(apiKey)
  if (!until) return false
  if (Date.now() >= until) {
    exhaustedUntil.delete(apiKey)
    return false
  }
  return true
}

/**
 * Ready keys first, rotated, then keys that are cooling down.
 * @param keys - Candidate API keys
 */
export const rotateGoogleApiKeys = (keys: string[]): string[] => {
  const ready = keys.filter((key) => !isKeyCoolingDown(key))
  const cooling = keys.filter((key) => isKeyCoolingDown(key))
  if (!ready.length) return cooling
  const start = Math.floor(Date.now() / 30000) % ready.length
  return ready.slice(start).concat(ready.slice(0, start), cooling)
}

/**
 * Whether Google asked us to stop using this key for now.
 * @param message - Error text from Places
 */
export const isKeyExhaustedError = (message: string): boolean =>
  /quota exceeded|permission denied|does not have permission|not authorized|api key not valid|api[_ ]key expired|key expired|suspended|disabled|request_denied|forbidden/i
    .test(message || '')
