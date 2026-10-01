'use client'

import { useCallback, useEffect, useState } from 'react'

import { sortDeliveryRecords, summarizeDeliveryRecords } from '@/lib/finder/delivery-utils'
import type { DeliveryRecord } from '@/types/email'

const STORAGE_KEY = 'adminfinder-delivery-records'

/**
 * Persists and loads delivery records from browser localStorage.
 */
export const useDeliveryRecords = () => {
  const [records, setRecords] = useState<DeliveryRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setRecords(sortDeliveryRecords(JSON.parse(stored) as DeliveryRecord[]))
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      setLoaded(true)
    }
  }, [])

  const saveRecords = useCallback((next: DeliveryRecord[]) => {
    const sorted = sortDeliveryRecords(next)
    setRecords(sorted)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
  }, [])

  const appendRecords = useCallback((newRecords: DeliveryRecord[]) => {
    setRecords((prev) => {
      const sorted = sortDeliveryRecords([...newRecords, ...prev])
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
      return sorted
    })
  }, [])

  return { records, loaded, saveRecords, appendRecords }
}
