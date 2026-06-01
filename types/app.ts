import type { Database } from './database'

type Tables = Database['public']['Tables']

export type Tenant = Tables['tenants']['Row']
export type UserProfile = Tables['users']['Row']
export type Barber = Tables['barbers']['Row']
export type BarberSchedule = Tables['barber_schedules']['Row']
export type Service = Tables['services']['Row']
export type Client = Tables['clients']['Row']
export type Appointment = Tables['appointments']['Row']
export type QueueTicket = Tables['queue_tickets']['Row']
export type Sale = Tables['sales']['Row']
export type SaleItem = Tables['sale_items']['Row']
export type Commission = Tables['commissions']['Row']
export type CashRegister = Tables['cash_registers']['Row']

export type UserRole = 'admin' | 'receptionist' | 'barber'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'no_show'
  | 'cancelled'

export type QueueStatus = 'waiting' | 'called' | 'in_progress' | 'completed' | 'cancelled'

export type PaymentMethod = 'cash' | 'clip' | 'getnet' | 'transfer'

// Usuario autenticado con claims del JWT inyectados por custom_access_token_hook
export type AuthenticatedUser = {
  id: string
  email: string
  tenantId: string
  role: UserRole
  name: string
}

// Ticket de cola con sus relaciones expandidas
export type QueueTicketWithRelations = {
  id: string
  tenant_id: string
  client_id: string | null
  barber_id: string
  service_id: string | null
  ticket_number: number
  estimated_start_at: string
  status: string
  source: string
  created_at: string
  client: { id: string; name: string; phone: string | null } | null
  barber: { id: string; name: string } | null
  service: { id: string; name: string; duration_minutes: number } | null
}

// Ticket simplificado para la pantalla TV /display
export type DisplayTicket = {
  id: string
  ticket_number: number
  status: string
  estimated_start_at: string
  client_first_name: string
  barber_name: string
}

// Cita con sus relaciones expandidas (resultado de SELECT con joins)
export type AppointmentWithRelations = {
  id: string
  tenant_id: string
  client_id: string
  barber_id: string
  service_id: string
  starts_at: string
  ends_at: string
  status: string
  notes: string | null
  booked_via: string
  created_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
  client: { id: string; name: string; phone: string | null } | null
  barber: { id: string; name: string } | null
  service: { id: string; name: string; duration_minutes: number; price: number } | null
}
