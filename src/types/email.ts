export type EmailResultType = 'verified' | 'suggested'

export interface EmailResult {
  email: string
  type: EmailResultType
  source?: string
}

export interface FindEmailRequest {
  domain: string
  firstName: string
  lastName: string
}

export interface FindEmailResponse {
  results: EmailResult[]
  domain: string
  hasMxRecords: boolean
}

export interface SendEmailRequest {
  recipients: string[]
  subject: string
  body: string
}

export type DeliveryStatus = 'pending' | 'delivered' | 'bounced' | 'failed'

export interface DeliveryRecord {
  id: string
  batchId: string
  recipient: string
  subject: string
  messageId?: string
  status: DeliveryStatus
  error?: string
  sentAt: string
  checkedAt?: string
}

export interface SendEmailResult {
  recipient: string
  status: 'sent' | 'failed'
  messageId?: string
  error?: string
}

export interface SendEmailResponse {
  success: boolean
  sent: number
  failed: string[]
  message: string
  batchId: string
  records: DeliveryRecord[]
}

export interface DeliveryStatusResponse {
  records: DeliveryRecord[]
  summary: {
    delivered: number
    bounced: number
    pending: number
    failed: number
    total: number
  }
}

export interface CheckDeliveryResponse extends DeliveryStatusResponse {
  message: string
}

export interface CheckDeliveryRequest {
  records: DeliveryRecord[]
}
