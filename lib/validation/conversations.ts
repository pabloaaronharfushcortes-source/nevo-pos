import { z } from 'zod'

// GET /api/conversations?mode=
// mode inválido → undefined (se listan todas), preservando el comportamiento previo.
export const conversationsQuerySchema = z.object({
  mode: z.enum(['agent', 'human']).optional().catch(undefined),
})

// POST /api/conversations/:id/messages
export const sendMessageSchema = z.object({
  text: z.string().trim().min(1, 'El mensaje está vacío'),
})

// PATCH /api/conversations/:id/mode
export const updateModeSchema = z.object({
  mode: z.enum(['agent', 'human']),
})
