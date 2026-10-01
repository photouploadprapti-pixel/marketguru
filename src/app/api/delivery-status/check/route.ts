import { NextResponse } from 'next/server'

import { applyDeliveryChecks } from '@/lib/finder/delivery-status'
import { summarizeDeliveryRecords } from '@/lib/finder/delivery-utils'
import type { CheckDeliveryRequest, CheckDeliveryResponse } from '@/types/email'

/**
 * POST /api/delivery-status/check — scans Gmail for bounces and updates records.
 */
export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as CheckDeliveryRequest
    const { records = [] } = body

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid delivery records.' }, { status: 400 })
    }

    const { records: updated, bouncedFound, newlyDelivered } = await applyDeliveryChecks(records)
    const summary = summarizeDeliveryRecords(updated)

    const parts: string[] = []
    if (bouncedFound > 0) parts.push(`${bouncedFound} bounce${bouncedFound === 1 ? '' : 's'} detected`)
    if (newlyDelivered > 0) {
      parts.push(`${newlyDelivered} marked as delivered`)
    }
    if (parts.length === 0) parts.push('No status changes — pending emails may still be in transit')

    const response: CheckDeliveryResponse = {
      records: updated,
      summary,
      message: parts.join('. ') + '.',
    }

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check delivery status.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
