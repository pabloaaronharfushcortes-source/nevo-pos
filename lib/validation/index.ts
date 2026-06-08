import { z } from 'zod'

// Lee el body JSON de un request de forma segura.
// Devuelve `undefined` si el body está vacío o malformado, de modo que
// `schema.safeParse(undefined)` falle con 400 en vez de lanzar un 500.
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

// Convierte los searchParams de una URL en un objeto plano para validar con Zod.
export function searchParamsToObject(url: string): Record<string, string> {
  const { searchParams } = new URL(url)
  return Object.fromEntries(searchParams.entries())
}

// Esquema reutilizable para parámetros de ruta con id UUID.
export const idParamSchema = z.object({ id: z.string().uuid() })
