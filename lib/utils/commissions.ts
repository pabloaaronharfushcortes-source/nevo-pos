export type Quincena = { period_start: string; period_end: string }

export function getCurrentQuincena(): Quincena {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()

  const pad = (n: number) => String(n).padStart(2, '0')

  if (day <= 15) {
    return {
      period_start: `${year}-${pad(month + 1)}-01`,
      period_end: `${year}-${pad(month + 1)}-15`,
    }
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return {
      period_start: `${year}-${pad(month + 1)}-16`,
      period_end: `${year}-${pad(month + 1)}-${lastDay}`,
    }
  }
}

// Redondea a 2 decimales para evitar errores de punto flotante
export function computeCommission(total: number, rate: number): number {
  return Math.round((total * rate) / 100 * 100) / 100
}
