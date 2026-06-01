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
