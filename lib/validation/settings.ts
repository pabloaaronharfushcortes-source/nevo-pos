import { z } from 'zod'

// ─── Servicios ───
// POST /api/services
export const createServiceSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  duration_minutes: z.number().int().min(1, 'La duración debe ser mayor a 0'),
  category: z.string().optional(),
})

// PATCH /api/services/:id
export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().nullable().optional(),
    price: z.number().min(0).optional(),
    duration_minutes: z.number().int().min(1).optional(),
    category: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo a actualizar',
  })

// ─── Barberos ───
// POST /api/barbers
export const createBarberSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  commission_rate: z.number().min(0).max(100, 'La comisión debe estar entre 0 y 100'),
  photo_url: z.string().url().or(z.literal('')).optional(),
})

// PATCH /api/barbers/:id
export const updateBarberSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    commission_rate: z.number().min(0).max(100).optional(),
    photo_url: z.string().url().or(z.literal('')).nullable().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo a actualizar',
  })

// ─── Datos del negocio (tenant) ───
// PATCH /api/settings
export const updateTenantSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email().or(z.literal('')).nullable().optional(),
    website: z.string().nullable().optional(),
    late_tolerance_minutes: z.number().int().min(0).optional(),
    appointment_buffer_minutes: z.number().int().min(0).optional(),
    agent_knowledge_base: z.string().nullable().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo a actualizar',
  })
