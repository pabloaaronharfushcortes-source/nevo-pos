import { NextResponse } from 'next/server'

// Helpers tipados para respuestas de API con formato estándar.
// Éxito:  { ok: true, data: T }
// Error:  { ok: false, error: string }
// Los errores nunca exponen stack traces ni mensajes crudos de Supabase al cliente.

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status })
}

// `details` solo debe usarse para errores del cliente (ej. validación Zod),
// nunca para errores internos del servidor.
export function err(message: string, status: number, details?: unknown): NextResponse {
  const body: { ok: false; error: string; details?: unknown } = { ok: false, error: message }
  if (details !== undefined) body.details = details
  return NextResponse.json(body, { status })
}
