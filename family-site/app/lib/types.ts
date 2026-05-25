// TypeScript types that mirror the database schema.
// Keeping these in sync with schema.sql gives us autocomplete and
// compile-time safety throughout the app.

export type RsvpStatus = 'yes' | 'no' | 'maybe'
export type BlastChannel = 'email' | 'sms' | 'both'
export type BlastStatus = 'scheduled' | 'sent' | 'failed'
export type BlastKind = 'announcement' | 'reminder' | 'update'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  is_admin: boolean
  notify_email: boolean
  notify_sms: boolean
  created_at: string
}

export interface FamilyEvent {
  id: string
  title: string
  description: string
  location: string
  starts_at: string
  ends_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Rsvp {
  id: string
  event_id: string
  user_id: string
  status: RsvpStatus
  party_size: number
  created_at: string
  updated_at: string
}

export interface Blast {
  id: string
  event_id: string
  created_by: string
  channel: BlastChannel
  kind: BlastKind
  message: string
  send_at: string
  status: BlastStatus
  sent_at: string | null
  created_at: string
}
