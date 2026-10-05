'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { updateDesk } from '@/lib/desk/store'
import { createId } from '@/lib/cn'
import type { Lead, LeadSource, LeadStatus } from '@/types/pipeline'
import { isLeadStatus } from '@/types/pipeline'

const leadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(180),
  company: z.string().trim().max(160).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  website: z.string().trim().max(240).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  notes: z.string().trim().max(2000).optional().default(''),
  status: z.string().optional(),
})

export type LeadActionResult = {
  ok: boolean
  message: string
}

/**
 * Refresh the pages that show pipeline data.
 */
const refresh = () => {
  revalidatePath('/pipeline')
  revalidatePath('/')
}

/**
 * Build a lead row from validated input.
 * @param input - Form fields
 * @param source - Where the lead came from
 * @param status - Starting stage
 */
const makeLead = (
  input: z.infer<typeof leadSchema>,
  source: LeadSource,
  status: LeadStatus,
): Lead => {
  const now = new Date().toISOString()
  return {
    id: createId(),
    name: input.name,
    email: input.email.toLowerCase(),
    company: input.company,
    phone: input.phone,
    website: input.website,
    city: input.city,
    notes: input.notes,
    source,
    status,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Add one lead at the New stage unless a stage is provided.
 * @param formData - Lead form fields
 */
export const actionCreateLead = async (formData: FormData): Promise<LeadActionResult> => {
  const parsed = leadSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    company: formData.get('company'),
    phone: formData.get('phone'),
    website: formData.get('website'),
    city: formData.get('city'),
    notes: formData.get('notes'),
    status: formData.get('status'),
  })
  if (!parsed.success) {
    return { ok: false, message: 'Name and a valid email are required.' }
  }
  const status = parsed.data.status && isLeadStatus(parsed.data.status)
    ? parsed.data.status
    : 'new'
  let duplicate = false
  await updateDesk((state) => {
    const email = parsed.data.email.toLowerCase()
    if (state.leads.some((lead) => lead.email === email)) {
      duplicate = true
      return
    }
    state.leads.unshift(makeLead(parsed.data, 'manual', status))
  })
  if (duplicate) return { ok: false, message: 'That email is already on the board.' }
  refresh()
  return { ok: true, message: 'Lead added.' }
}

/**
 * Move a lead to another stage.
 * @param id - Lead id
 * @param status - Next stage
 */
export const actionMoveLead = async (id: string, status: LeadStatus): Promise<LeadActionResult> => {
  if (!isLeadStatus(status)) return { ok: false, message: 'Unknown stage.' }
  await updateDesk((state) => {
    const lead = state.leads.find((item) => item.id === id)
    if (!lead) return
    lead.status = status
    lead.updatedAt = new Date().toISOString()
  })
  refresh()
  return { ok: true, message: 'Stage updated.' }
}

/**
 * Remove a lead from the board.
 * @param id - Lead id
 */
export const actionDeleteLead = async (id: string): Promise<LeadActionResult> => {
  await updateDesk((state) => {
    state.leads = state.leads.filter((lead) => lead.id !== id)
  })
  refresh()
  return { ok: true, message: 'Lead removed.' }
}

/**
 * Import Place Finder rows, skipping emails already on the board.
 * @param rows - CSV records with Name and Email columns
 */
export const actionImportLeads = async (
  rows: Array<Record<string, string>>,
): Promise<LeadActionResult> => {
  let added = 0
  await updateDesk((state) => {
    const seen = new Set(state.leads.map((lead) => lead.email))
    for (const row of rows) {
      const email = (row.Email || row.email || '').trim().toLowerCase()
      const name = (row.Name || row.name || row['Center Name'] || '').trim()
      if (!email.includes('@') || !name || seen.has(email)) continue
      seen.add(email)
      state.leads.unshift(makeLead({
        name,
        email,
        company: name,
        phone: row.Phone || row.phone || '',
        website: row.Website || row.website || '',
        city: row['City Input'] || row.City || row.city || '',
        notes: '',
        status: 'new',
      }, 'csv', 'new'))
      added += 1
    }
  })
  refresh()
  return { ok: true, message: added ? `Added ${added} leads.` : 'No new leads in that file.' }
}
