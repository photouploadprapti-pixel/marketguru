import { emailRejectReason } from '@/lib/leads/usable-email'

export type CsvRow = Record<string, string>

export type RemovedRow = {
  row: CsvRow
  email: string
  reason: string
}

/**
 * Read the email column from a header-keyed CSV row.
 * @param row - One parsed CSV record
 */
export const rowEmail = (row: CsvRow): string => {
  const value = row.Email || row.email || row['E-mail'] || row['E-Mail'] || ''
  return value.trim()
}

/**
 * Split rows into usable contacts and rows that should leave the file.
 * @param rows - Parsed CSV records
 */
export const cleanLeadRows = (rows: CsvRow[]): { kept: CsvRow[]; removed: RemovedRow[] } => {
  const kept: CsvRow[] = []
  const removed: RemovedRow[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const email = rowEmail(row).toLowerCase()
    const reason = emailRejectReason(email)
    if (reason) {
      removed.push({ row, email, reason })
      continue
    }
    if (seen.has(email)) {
      removed.push({ row, email, reason: 'duplicate' })
      continue
    }
    seen.add(email)
    kept.push({ ...row, Email: email })
  }

  return { kept, removed }
}
