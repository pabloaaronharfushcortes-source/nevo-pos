import { z } from 'zod'

const TICKET_STATUSES = ['waiting', 'called', 'in_progress', 'completed', 'cancelled'] as const
const SOURCES = ['reception', 'whatsapp'] as const

// GET /api/queue?date= — fecha inválida → undefined (se usa hoy por defecto).
export const queueQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
})

// POST /api/queue — walk-in. Todos los campos son opcionales (ficha a cualquier barbero).
export const createTicketSchema = z.object({
  barberId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  source: z.enum(SOURCES).optional(),
})

// PATCH /api/queue/:id
export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES),
})
