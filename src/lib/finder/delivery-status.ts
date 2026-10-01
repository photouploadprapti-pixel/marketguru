import { fetchBouncedAddresses } from '@/lib/finder/bounce-checker'
import { getUndeliverableReason } from '@/lib/finder/email-verifier'
import type { DeliveryRecord } from '@/types/email'

/** Minimum time before marking a valid-domain email as delivered (1 minute). */
const PENDING_TO_DELIVERED_MS = 60 * 1000

/**
 * Runs bounce and MX checks against delivery records and returns updated copies.
 * @param records - Current delivery records from client storage
 */
export const applyDeliveryChecks = async (
  records: DeliveryRecord[],
): Promise<{
  records: DeliveryRecord[]
  bouncedFound: number
  newlyDelivered: number
}> => {
  const bounceMap = await fetchBouncedAddresses()
  const now = Date.now()
  let bouncedFound = 0
  let newlyDelivered = 0

  const updated = await Promise.all(
    records.map(async (record) => {
      if (
        record.status === 'failed'
        || record.status === 'bounced'
        || record.status === 'delivered'
      ) {
        return record
      }

      const recipient = record.recipient.toLowerCase()
      const checkedAt = new Date().toISOString()

      const undeliverableReason = await getUndeliverableReason(recipient)
      if (undeliverableReason) {
        bouncedFound += 1
        return {
          ...record,
          status: 'bounced' as const,
          error: undeliverableReason,
          checkedAt,
        }
      }

      const bounce = bounceMap.get(recipient)
      if (bounce) {
        bouncedFound += 1
        return {
          ...record,
          status: 'bounced' as const,
          error: bounce.reason,
          checkedAt,
        }
      }

      const age = now - new Date(record.sentAt).getTime()
      if (age >= PENDING_TO_DELIVERED_MS) {
        newlyDelivered += 1
        return {
          ...record,
          status: 'delivered' as const,
          checkedAt,
        }
      }

      return record
    }),
  )

  return { records: updated, bouncedFound, newlyDelivered }
}
