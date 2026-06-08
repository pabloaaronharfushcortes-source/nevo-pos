import { z } from 'zod'

const CLASSIFICATIONS = ['new', 'recurrent', 'vip'] as const

// GET /api/clients?search=&classification=&page=
// Filtros inválidos se ignoran (comportamiento previo): se usa .catch para no romper la query.
export const clientsQuerySchema = z.object({
  search: z.string().optional().catch(undefined),
  classification: z.enum(CLASSIFICATIONS).optional().catch(undefined),
  page: z.string().regex(/^\d+$/).optional().catch(undefined),
})

// POST /api/clients
export const createClientSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  whatsapp_id: z.string().optional(),
  notes: z.string().optional(),
  preferred_barber_id: z.string().uuid().or(z.literal('')).optional(),
})

// PATCH /api/clients/:id
export const updateClientSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().optional(),
    email: z.string().email().or(z.literal('')).optional(),
    whatsapp_id: z.string().optional(),
    notes: z.string().optional(),
    preferred_barber_id: z.string().uuid().nullable().optional(),
    loyalty_stamps: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Se requiere al menos un campo a actualizar' }
  )
