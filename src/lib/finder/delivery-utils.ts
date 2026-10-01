import type { DeliveryRecord } from '@/types/email'

/**
 * Creates a new delivery record id.
 */
export const createRecordId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/**
 * Builds a summary count for each delivery status.
 * @param records - Delivery records to summarize
 */
export const summarizeDeliveryRecords = (records: DeliveryRecord[]) => ({
  delivered: records.filter((r) => r.status === 'delivered').length,
  bounced: records.filter((r) => r.status === 'bounced').length,
  pending: records.filter((r) => r.status === 'pending').length,
  failed: records.filter((r) => r.status === 'failed').length,
  total: records.length,
})

/**
 * Sorts delivery records newest first.
 * @param records - Records to sort
 */
export const sortDeliveryRecords = (records: DeliveryRecord[]): DeliveryRecord[] =>
  [...records].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  )
