// Rate limiting best-effort en memoria para el webhook de WhatsApp.
// Máximo MAX_REQUESTS por número (WAID) por ventana (CLAUDE.md §11 regla 6).
// Nota: en entornos serverless la memoria no se comparte entre instancias;
// para un límite duro en producción conviene respaldarlo en Redis/Postgres.

const MAX_REQUESTS = 20
const WINDOW_MS = 60_000

const hits = new Map<string, number[]>()

export function checkRateLimit(whatsappId: string): boolean {
  const now = Date.now()
  const timestamps = (hits.get(whatsappId) ?? []).filter(t => now - t < WINDOW_MS)

  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(whatsappId, timestamps)
    return false
  }

  timestamps.push(now)
  hits.set(whatsappId, timestamps)

  // Limpieza oportunista para evitar crecimiento ilimitado del Map
  if (hits.size > 5000) {
    Array.from(hits.entries()).forEach(([key, ts]) => {
      if (ts.every((t: number) => now - t >= WINDOW_MS)) hits.delete(key)
    })
  }

  return true
}
