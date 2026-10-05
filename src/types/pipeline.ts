export const LEAD_STATUSES = [
  'new',
  'contacted',
  'replied',
  'qualified',
  'closed_won',
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export type LeadSource = 'manual' | 'csv' | 'inbox'

export type Lead = {
  id: string
  name: string
  email: string
  company: string
  phone: string
  website: string
  city: string
  source: LeadSource
  status: LeadStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  qualified: 'Qualified',
  closed_won: 'Closed/Won',
}

/**
 * Whether a value is one of the pipeline stages.
 * @param value - Unknown status string
 */
export const isLeadStatus = (value: string): value is LeadStatus =>
  (LEAD_STATUSES as readonly string[]).includes(value)
