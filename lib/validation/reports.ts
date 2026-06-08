import { z } from 'zod'

// GET /api/reports?from=&to=
// Rango de fechas (inclusive) para el resumen de ventas y comisiones.
export const reportsQuerySchema = z.object({
  from: z.string().min(1, 'Parámetro from requerido'),
  to: z.string().min(1, 'Parámetro to requerido'),
})
