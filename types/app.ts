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
export type Conversation = Tables['conversations']['Row']
export type Message = Tables['messages']['Row']

export type ConversationMode = 'agent' | 'human'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document'
export type MessageSentBy = 'agent' | 'human' | 'client'

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

// Entrada unificada del historial de visitas de un cliente
export type VisitEntry = {
  id: string
  date: string
  type: 'appointment' | 'sale'
  barber_name: string | null
  services: string[]
  total: number | null
  status: string
  payment_method: string | null
}

// Conversación de WhatsApp con datos del cliente para la lista del panel
export type ConversationWithClient = {
  id: string
  tenant_id: string
  client_id: string | null
  whatsapp_id: string
  mode: string
  last_message_at: string | null
  last_message_preview: string | null
  unread_human_count: number
  created_at: string
  client: { id: string; name: string; phone: string | null; classification: string } | null
}

// Conversación con su hilo completo de mensajes (vista de detalle)
export type ConversationWithMessages = ConversationWithClient & {
  messages: Message[]
}

// Perfil completo del cliente con barbero preferido e historial
export type ClientWithProfile = Client & {
  preferred_barber: { id: string; name: string } | null
  visit_history: VisitEntry[]
}

// Venta con sus relaciones expandidas
export type SaleWithRelations = {
  id: string
  tenant_id: string
  appointment_id: string | null
  queue_ticket_id: string | null
  client_id: string | null
  barber_id: string
  cashier_id: string
  cash_register_id: string | null
  subtotal: number
  discount: number
  tip: number
  total: number
  payment_method: string
  payment_reference: string | null
  notes: string | null
  created_at: string
  deleted_at: string | null
  client: { id: string; name: string } | null
  barber: { id: string; name: string } | null
  cashier: { id: string; name: string } | null
  items: Array<{
    id: string
    type: string
    name: string
    price: number
    quantity: number
    subtotal: number
    service_id: string | null
  }>
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
