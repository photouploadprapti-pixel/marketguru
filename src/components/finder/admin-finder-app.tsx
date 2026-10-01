'use client'

import { useState } from 'react'

import { DeliveryStatusPanel } from '@/components/finder/delivery-status'
import { EmailFinder } from '@/components/finder/email-finder'
import { EmailSender } from '@/components/finder/email-sender'
import { useDeliveryRecords } from '@/hooks/use-delivery-records'
import type { DeliveryRecord, EmailResult } from '@/types/email'

/**
 * Main application shell combining email finder and sender features.
 */
export const AdminFinderApp = () => {
  const [foundEmails, setFoundEmails] = useState<EmailResult[]>([])
  const { records, loaded, saveRecords, appendRecords } = useDeliveryRecords()

  const handleSent = (newRecords: DeliveryRecord[]) => {
    appendRecords(newRecords)
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <EmailFinder onResultsChange={setFoundEmails} />
      <EmailSender foundEmails={foundEmails} onSent={handleSent} />
      <DeliveryStatusPanel
        records={records}
        loaded={loaded}
        onRecordsChange={saveRecords}
      />
    </div>
  )
}
