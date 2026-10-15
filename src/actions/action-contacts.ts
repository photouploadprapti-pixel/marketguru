'use server'

import { revalidatePath } from 'next/cache'

import { createId } from '@/lib/cn'
import { updateDesk } from '@/lib/desk/store'
import { isUsableEmail } from '@/lib/leads/usable-email'
import type { ContactDraft, SuppressReason } from '@/types/marketing'

export type ContactActionResult = {
  ok: boolean
  message: string
  saved: number
  skipped: number
}

/**
 * Refresh pages that read the contact book.
 */
const refresh = () => {
  revalidatePath('/contacts')
  revalidatePath('/campaign')
  revalidatePath('/sequences')
  revalidatePath('/pipeline')
  revalidatePath('/')
}

/**
 * Save discovered people, updating a matching email instead of duplicating it.
 * @param drafts - Contacts from a finder, CSV, or the cleaner
 * @param listId - Optional list to attach
 */
export const actionSaveContacts = async (
  drafts: ContactDraft[],
  listId = '',
): Promise<ContactActionResult> => {
  let saved = 0
  let skipped = 0
  const now = new Date().toISOString()

  await updateDesk((state) => {
    for (const draft of drafts) {
      const email = draft.email.trim().toLowerCase()
      if (!isUsableEmail(email)) {
        skipped += 1
        continue
      }
      const extraList = listId || draft.listId || ''
      const existing = state.contacts.find((item) => item.email === email)
      if (existing) {
        if (!existing.name && draft.name) existing.name = draft.name
        if (!existing.company && draft.company) existing.company = draft.company
        if (!existing.phone && draft.phone) existing.phone = draft.phone
        if (!existing.website && draft.website) existing.website = draft.website
        if (!existing.city && draft.city) existing.city = draft.city
        if (!existing.rating && draft.rating) existing.rating = draft.rating
        if (!existing.reviews && draft.reviews) existing.reviews = draft.reviews
        if (extraList && !existing.listIds.includes(extraList)) existing.listIds.push(extraList)
        existing.updatedAt = now
        saved += 1
        continue
      }
      state.contacts.unshift({
        id: createId(8),
        name: draft.name?.trim() || '',
        email,
        company: draft.company?.trim() || '',
        phone: draft.phone?.trim() || '',
        website: draft.website?.trim() || '',
        city: draft.city?.trim() || '',
        rating: draft.rating ?? 0,
        reviews: draft.reviews ?? 0,
        source: draft.source,
        listIds: extraList ? [extraList] : [],
        createdAt: now,
        updatedAt: now,
      })
      saved += 1
    }
  })

  refresh()
  return {
    ok: saved > 0,
    saved,
    skipped,
    message: saved
      ? `Saved ${saved} contact${saved === 1 ? '' : 's'}.`
      : 'No usable contacts to save.',
  }
}

/**
 * Remove one saved contact.
 * @param id - Contact id
 */
export const actionDeleteContact = async (id: string): Promise<ContactActionResult> => {
  await updateDesk((state) => {
    state.contacts = state.contacts.filter((item) => item.id !== id)
  })
  refresh()
  return { ok: true, saved: 0, skipped: 0, message: 'Contact removed.' }
}

/**
 * Create a named list for later mailing.
 * @param name - List name
 */
export const actionCreateList = async (name: string): Promise<ContactActionResult> => {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, saved: 0, skipped: 0, message: 'Name the list first.' }
  await updateDesk((state) => {
    state.lists.unshift({
      id: createId(8),
      name: trimmed.slice(0, 80),
      createdAt: new Date().toISOString(),
    })
  })
  refresh()
  return { ok: true, saved: 1, skipped: 0, message: `List “${trimmed}” is ready.` }
}

/**
 * Delete a list without deleting its contacts.
 * @param id - List id
 */
export const actionDeleteList = async (id: string): Promise<ContactActionResult> => {
  await updateDesk((state) => {
    state.lists = state.lists.filter((item) => item.id !== id)
    for (const contact of state.contacts) {
      contact.listIds = contact.listIds.filter((listId) => listId !== id)
    }
  })
  refresh()
  return { ok: true, saved: 0, skipped: 0, message: 'List removed.' }
}

/**
 * Block an address from campaign, finder, and sequence sends.
 * @param email - Address to block
 * @param reason - Why it is blocked
 */
export const actionAddSuppression = async (
  email: string,
  reason: SuppressReason,
): Promise<ContactActionResult> => {
  const value = email.trim().toLowerCase()
  if (!value.includes('@')) {
    return { ok: false, saved: 0, skipped: 0, message: 'Enter an email address.' }
  }
  await updateDesk((state) => {
    if (state.suppressions.some((item) => item.email === value)) return
    state.suppressions.unshift({
      email: value,
      reason,
      createdAt: new Date().toISOString(),
    })
    for (const enrollment of state.enrollments) {
      if (enrollment.email === value && enrollment.status === 'active') {
        enrollment.status = 'suppressed'
      }
    }
  })
  refresh()
  return { ok: true, saved: 1, skipped: 0, message: `${value} will not be mailed.` }
}

/**
 * Block every address, recording bounces on matching campaign reports.
 * @param emails - Addresses to block
 * @param reason - Why they are blocked
 */
export const actionSuppressEmails = async (
  emails: string[],
  reason: SuppressReason,
): Promise<ContactActionResult> => {
  const unique = [...new Set(emails.map((item) => item.trim().toLowerCase()).filter((item) => item.includes('@')))]
  await updateDesk((state) => {
    const now = new Date().toISOString()
    for (const email of unique) {
      if (!state.suppressions.some((item) => item.email === email)) {
        state.suppressions.unshift({ email, reason, createdAt: now })
      }
      for (const enrollment of state.enrollments) {
        if (enrollment.email === email && enrollment.status === 'active') {
          enrollment.status = 'suppressed'
        }
      }
      if (reason !== 'bounce') continue
      for (const report of state.reports) {
        if (!report.recipients.includes(email) || report.bouncedEmails.includes(email)) continue
        report.bouncedEmails.push(email)
        report.bounced = report.bouncedEmails.length
      }
    }
  })
  refresh()
  revalidatePath('/reports')
  return {
    ok: true,
    saved: unique.length,
    skipped: 0,
    message: unique.length
      ? `Blocked ${unique.length} address${unique.length === 1 ? '' : 'es'}.`
      : 'No addresses to block.',
  }
}

/**
 * Allow an address to be mailed again.
 * @param email - Address to restore
 */
export const actionRemoveSuppression = async (email: string): Promise<ContactActionResult> => {
  const value = email.trim().toLowerCase()
  await updateDesk((state) => {
    state.suppressions = state.suppressions.filter((item) => item.email !== value)
  })
  refresh()
  return { ok: true, saved: 0, skipped: 0, message: `${value} can be mailed again.` }
}
