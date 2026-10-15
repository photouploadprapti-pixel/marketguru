export const CONTACT_SOURCES = ['places', 'finder', 'csv', 'clean', 'manual'] as const

export type ContactSource = (typeof CONTACT_SOURCES)[number]

export const SUPPRESS_REASONS = [
  'bounce',
  'not_interested',
  'unsubscribe',
  'invalid',
  'manual',
] as const

export type SuppressReason = (typeof SUPPRESS_REASONS)[number]

export const ENROLLMENT_STATUSES = [
  'active',
  'replied',
  'suppressed',
  'done',
] as const

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export type SavedContact = {
  id: string
  name: string
  email: string
  company: string
  phone: string
  website: string
  city: string
  rating: number
  reviews: number
  source: ContactSource
  listIds: string[]
  createdAt: string
  updatedAt: string
}

export type ContactList = {
  id: string
  name: string
  createdAt: string
}

export type Suppression = {
  email: string
  reason: SuppressReason
  createdAt: string
}

export type MailTemplate = {
  id: string
  name: string
  subject: string
  body: string
  createdAt: string
}

export type SequenceStep = {
  delayDays: number
  subject: string
  body: string
}

export type Sequence = {
  id: string
  name: string
  listId: string
  accountId: string
  steps: SequenceStep[]
  createdAt: string
}

export type Enrollment = {
  id: string
  sequenceId: string
  contactId: string
  email: string
  step: number
  nextAt: string
  status: EnrollmentStatus
}

export type CampaignReport = {
  id: string
  name: string
  sent: number
  failed: number
  skipped: number
  bounced: number
  recipients: string[]
  repliedEmails: string[]
  interestedEmails: string[]
  bouncedEmails: string[]
  createdAt: string
}

export type FollowTask = {
  id: string
  email: string
  name: string
  title: string
  done: boolean
  createdAt: string
}

export type ContactDraft = {
  name?: string
  email: string
  company?: string
  phone?: string
  website?: string
  city?: string
  rating?: number
  reviews?: number
  source: ContactSource
  listId?: string
}
