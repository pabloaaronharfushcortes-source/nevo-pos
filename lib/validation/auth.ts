import { z } from 'zod'

// POST /api/auth/login
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

// POST /api/auth/verify-otp
export const verifyOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
})
