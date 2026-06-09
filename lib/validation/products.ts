import { z } from 'zod'

// ─── Productos (inventario para venta en POS) ───

// POST /api/products
export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  cost: z.number().min(0, 'El costo no puede ser negativo').optional(),
  stock_quantity: z.number().int().min(0, 'El stock no puede ser negativo').optional(),
  stock_minimum: z.number().int().min(0, 'El mínimo no puede ser negativo').optional(),
  unit: z.string().trim().min(1).optional(),
})

// PATCH /api/products/:id
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().nullable().optional(),
    sku: z.string().nullable().optional(),
    price: z.number().min(0).optional(),
    cost: z.number().min(0).nullable().optional(),
    stock_quantity: z.number().int().min(0).optional(),
    stock_minimum: z.number().int().min(0).optional(),
    unit: z.string().trim().min(1).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo a actualizar',
  })
