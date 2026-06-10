import { z } from 'zod'

const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
] as const

const BOOKED_VIA = ['whatsapp', 'web', 'reception', 'app'] as const

// GET /api/appointments?from=&to=
// from/to deben ser fechas parseables: una fecha basura (ej. "FECHA_INVALIDA")
// se rechaza con 400 en la capa de validación en lugar de llegar a Postgres y
// reventar con un 500 (robustez — el harness prueba este caso explícitamente).
const dateLike = (label: string) =>
  z.string().min(1, `Parámetro ${label} requerido`)
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: `Parámetro ${label} no es una fecha válida` })

export const appointmentsQuerySchema = z.object({
  from: dateLike('from'),
  to: dateLike('to'),
})

// POST /api/appointments
export const createAppointmentSchema = z.object({
  clientId: z.string().uuid(),
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  notes: z.string().optional(),
  bookedVia: z.enum(BOOKED_VIA).optional(),
})

// PATCH /api/appointments/:id
// Soporta cambios de estado/notas y reagendado (drag-drop): startsAt / barberId / serviceId
export const updateAppointmentSchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    notes: z.string().nullable().optional(),
    cancellationReason: z.string().optional(),
    startsAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
    barberId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Se requiere al menos un campo a actualizar' }
  )
