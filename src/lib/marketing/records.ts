import type {
  CampaignReport,
  ContactList,
  ContactSource,
  Enrollment,
  EnrollmentStatus,
  FollowTask,
  MailTemplate,
  SavedContact,
  Sequence,
  SequenceStep,
  SuppressReason,
  Suppression,
} from '@/types/marketing'
import {
  CONTACT_SOURCES,
  ENROLLMENT_STATUSES,
  SUPPRESS_REASONS,
} from '@/types/marketing'

export type MarketingState = {
  contacts: SavedContact[]
  lists: ContactList[]
  suppressions: Suppression[]
  templates: MailTemplate[]
  sequences: Sequence[]
  enrollments: Enrollment[]
  reports: CampaignReport[]
  tasks: FollowTask[]
}

/**
 * Whether a value is a plain object.
 * @param value - Unknown JSON
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Read a string, or an empty string.
 * @param value - Unknown JSON value
 */
const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Read a finite number, or zero.
 * @param value - Unknown JSON value
 */
const amount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

/**
 * Keep only strings from an unknown list.
 * @param value - Unknown JSON value
 */
const texts = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

/**
 * Empty marketing collections for a new desk.
 */
export const emptyMarketing = (): MarketingState => ({
  contacts: [],
  lists: [],
  suppressions: [],
  templates: [],
  sequences: [],
  enrollments: [],
  reports: [],
  tasks: [],
})

/**
 * Keep a contact source, or fall back to manual.
 * @param value - Stored source
 */
const asSource = (value: unknown): ContactSource =>
  typeof value === 'string' && (CONTACT_SOURCES as readonly string[]).includes(value)
    ? (value as ContactSource)
    : 'manual'

/**
 * Keep a suppression reason, or fall back to manual.
 * @param value - Stored reason
 */
const asReason = (value: unknown): SuppressReason =>
  typeof value === 'string' && (SUPPRESS_REASONS as readonly string[]).includes(value)
    ? (value as SuppressReason)
    : 'manual'

/**
 * Keep an enrollment status, or fall back to active.
 * @param value - Stored status
 */
const asEnrollmentStatus = (value: unknown): EnrollmentStatus =>
  typeof value === 'string' && (ENROLLMENT_STATUSES as readonly string[]).includes(value)
    ? (value as EnrollmentStatus)
    : 'active'

/**
 * Parse one saved contact.
 * @param value - Unknown JSON
 */
const asContact = (value: unknown): SavedContact | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.email !== 'string') {
    return null
  }
  return {
    id: value.id,
    name: text(value.name),
    email: value.email.toLowerCase(),
    company: text(value.company),
    phone: text(value.phone),
    website: text(value.website),
    city: text(value.city),
    rating: amount(value.rating),
    reviews: amount(value.reviews),
    source: asSource(value.source),
    listIds: texts(value.listIds),
    createdAt: text(value.createdAt) || new Date().toISOString(),
    updatedAt: text(value.updatedAt) || new Date().toISOString(),
  }
}

/**
 * Parse one named list.
 * @param value - Unknown JSON
 */
const asList = (value: unknown): ContactList | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null
  }
  return {
    id: value.id,
    name: value.name,
    createdAt: text(value.createdAt) || new Date().toISOString(),
  }
}

/**
 * Parse one blocked address.
 * @param value - Unknown JSON
 */
const asSuppression = (value: unknown): Suppression | null => {
  if (!isRecord(value) || typeof value.email !== 'string' || !value.email.includes('@')) {
    return null
  }
  return {
    email: value.email.toLowerCase(),
    reason: asReason(value.reason),
    createdAt: text(value.createdAt) || new Date().toISOString(),
  }
}

/**
 * Parse one saved template.
 * @param value - Unknown JSON
 */
const asTemplate = (value: unknown): MailTemplate | null => {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    name: text(value.name) || 'Template',
    subject: text(value.subject),
    body: text(value.body),
    createdAt: text(value.createdAt) || new Date().toISOString(),
  }
}

/**
 * Parse one sequence step.
 * @param value - Unknown JSON
 */
const asStep = (value: unknown): SequenceStep | null => {
  if (!isRecord(value)) return null
  const delay = amount(value.delayDays)
  return {
    delayDays: Math.max(0, Math.min(60, Math.round(delay))),
    subject: text(value.subject),
    body: text(value.body),
  }
}

/**
 * Parse one follow-up sequence.
 * @param value - Unknown JSON
 */
const asSequence = (value: unknown): Sequence | null => {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const steps = Array.isArray(value.steps)
    ? value.steps.flatMap((item) => {
      const step = asStep(item)
      return step ? [step] : []
    })
    : []
  if (!steps.length) return null
  return {
    id: value.id,
    name: text(value.name) || 'Sequence',
    listId: text(value.listId),
    accountId: text(value.accountId),
    steps,
    createdAt: text(value.createdAt) || new Date().toISOString(),
  }
}

/**
 * Parse one sequence enrollment.
 * @param value - Unknown JSON
 */
const asEnrollment = (value: unknown): Enrollment | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.email !== 'string') {
    return null
  }
  return {
    id: value.id,
    sequenceId: text(value.sequenceId),
    contactId: text(value.contactId),
    email: value.email.toLowerCase(),
    step: Math.max(0, Math.round(amount(value.step))),
    nextAt: text(value.nextAt) || new Date().toISOString(),
    status: asEnrollmentStatus(value.status),
  }
}

/**
 * Parse one campaign report.
 * @param value - Unknown JSON
 */
const asReport = (value: unknown): CampaignReport | null => {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    name: text(value.name) || 'Campaign',
    sent: amount(value.sent),
    failed: amount(value.failed),
    skipped: amount(value.skipped),
    bounced: amount(value.bounced),
    recipients: texts(value.recipients).map((email) => email.toLowerCase()),
    repliedEmails: texts(value.repliedEmails).map((email) => email.toLowerCase()),
    interestedEmails: texts(value.interestedEmails).map((email) => email.toLowerCase()),
    bouncedEmails: texts(value.bouncedEmails).map((email) => email.toLowerCase()),
    createdAt: text(value.createdAt) || new Date().toISOString(),
  }
}

/**
 * Parse one follow-up task.
 * @param value - Unknown JSON
 */
const asTask = (value: unknown): FollowTask | null => {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    email: text(value.email).toLowerCase(),
    name: text(value.name),
    title: text(value.title) || 'Follow up',
    done: value.done === true,
    createdAt: text(value.createdAt) || new Date().toISOString(),
  }
}

/**
 * Map an unknown list through a parser.
 * @param value - Unknown JSON list
 * @param parse - Row parser
 */
const rows = <T>(value: unknown, parse: (item: unknown) => T | null): T[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
      const parsed = parse(item)
      return parsed ? [parsed] : []
    })
    : []

/**
 * Normalize marketing JSON, keeping older desks that have none of these fields.
 * @param value - Parsed desk object
 */
export const asMarketing = (value: Record<string, unknown>): MarketingState => ({
  contacts: rows(value.contacts, asContact),
  lists: rows(value.lists, asList),
  suppressions: rows(value.suppressions, asSuppression),
  templates: rows(value.templates, asTemplate),
  sequences: rows(value.sequences, asSequence),
  enrollments: rows(value.enrollments, asEnrollment),
  reports: rows(value.reports, asReport),
  tasks: rows(value.tasks, asTask),
})
