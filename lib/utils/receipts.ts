export type ReceiptItem = {
  name: string
  quantity: number
  price: number
  subtotal: number
}

export type SaleReceiptData = {
  tenantName: string
  saleId: string
  date: string
  cashierName: string
  barberName: string
  clientName: string | null
  items: ReceiptItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  paymentReference: string | null
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  clip: 'Clip',
  getnet: 'Getnet',
  transfer: 'Transferencia',
}

const fmt = (n: number) => `$${n.toFixed(2)}`

// Devuelve string con formato WhatsApp (bold con *, cursiva con _)
// Usado en Paso 9 para enviar ticket al cliente
export function formatSaleReceipt(data: SaleReceiptData): string {
  const dateStr = new Date(data.date).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  })

  const lines: string[] = [
    `*${data.tenantName}*`,
    `📅 ${dateStr}`,
    data.clientName ? `👤 ${data.clientName}` : '',
    `✂️ ${data.barberName}`,
    '─────────────────────',
  ].filter(Boolean)

  for (const item of data.items) {
    const qty = item.quantity > 1 ? ` x${item.quantity}` : ''
    lines.push(`${item.name}${qty}  ${fmt(item.subtotal)}`)
  }

  lines.push('─────────────────────')

  if (data.discount > 0) {
    lines.push(`Subtotal: ${fmt(data.subtotal)}`)
    lines.push(`Descuento: -${fmt(data.discount)}`)
  }

  lines.push(`*Total: ${fmt(data.total)}*`)
  lines.push(`Pago: ${METHOD_LABEL[data.paymentMethod] ?? data.paymentMethod}`)

  if (data.paymentReference) {
    lines.push(`Ref: ${data.paymentReference}`)
  }

  lines.push(`\n_Folio: ${data.saleId.slice(0, 8).toUpperCase()}_`)

  return lines.join('\n')
}
