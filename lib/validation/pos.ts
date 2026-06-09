import { z } from 'zod'

const PAYMENT_METHODS = ['cash', 'clip', 'getnet', 'transfer'] as const

const saleItemSchema = z.object({
  type: z.enum(['service', 'product']).default('service'),
  serviceId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
})

// POST /api/pos
export const createSaleSchema = z.object({
  barberId: z.string().uuid(),
  items: z.array(saleItemSchema).min(1, 'Se requiere al menos un artículo'),
  discount: z.number().nonnegative().optional(),
  tip: z.number().nonnegative().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
  clientId: z.string().uuid().optional(),
  queueTicketId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  cashRegisterId: z.string().uuid().optional(),
})

// POST /api/pos/cash-register
export const openRegisterSchema = z.object({
  opening_amount: z.number().nonnegative(),
  notes: z.string().optional(),
})

// PATCH /api/pos/cash-register/:id
export const closeRegisterSchema = z.object({
  closing_amount: z.number().nonnegative(),
  notes: z.string().optional(),
})
