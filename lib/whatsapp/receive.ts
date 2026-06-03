import crypto from 'crypto'

const GRAPH_VERSION = 'v21.0'

// Mensaje entrante normalizado a partir del payload de Meta
export type IncomingMessage = {
  whatsappId: string            // WAID del remitente
  phoneNumberId: string         // phone number id del negocio (identifica al tenant)
  messageId: string             // id de Meta — para deduplicar
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  text: string | null
  mediaId: string | null        // id del adjunto, si aplica
}

// Verifica la firma X-Hub-Signature-256 del webhook (regla de seguridad 5).
// Compara con HMAC-SHA256 del cuerpo crudo usando WHATSAPP_APP_SECRET.
export function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    const a = Buffer.from(signatureHeader)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// Extrae el primer mensaje del payload del webhook. Devuelve null si el evento
// no es un mensaje (status updates, etc. → se ignoran con 200).
export function parseWebhook(payload: unknown): IncomingMessage | null {
  try {
    const body = payload as {
      entry?: Array<{
        changes?: Array<{
          field?: string
          value?: {
            metadata?: { phone_number_id?: string }
            messages?: Array<{
              from?: string
              id?: string
              type?: string
              text?: { body?: string }
              image?: { id?: string; caption?: string }
              audio?: { id?: string }
              video?: { id?: string; caption?: string }
              document?: { id?: string; caption?: string }
            }>
          }
        }>
      }>
    }

    const change = body.entry?.[0]?.changes?.[0]
    if (change?.field !== 'messages') return null

    const value = change.value
    const phoneNumberId = value?.metadata?.phone_number_id
    const message = value?.messages?.[0]
    if (!phoneNumberId || !message?.from || !message.id || !message.type) return null

    const type = message.type as IncomingMessage['type']
    let text: string | null = null
    let mediaId: string | null = null

    switch (type) {
      case 'text':     text = message.text?.body ?? null; break
      case 'image':    mediaId = message.image?.id ?? null; text = message.image?.caption ?? null; break
      case 'audio':    mediaId = message.audio?.id ?? null; break
      case 'video':    mediaId = message.video?.id ?? null; text = message.video?.caption ?? null; break
      case 'document': mediaId = message.document?.id ?? null; text = message.document?.caption ?? null; break
      default:         return null
    }

    return {
      whatsappId: message.from,
      phoneNumberId,
      messageId: message.id,
      type,
      text,
      mediaId,
    }
  } catch {
    return null
  }
}

// Descarga un adjunto de WhatsApp: resuelve la URL temporal y baja los bytes.
export async function downloadMedia(
  mediaId: string,
  accessToken: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!metaRes.ok) return null
    const meta = await metaRes.json() as { url?: string; mime_type?: string }
    if (!meta.url) return null

    const fileRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!fileRes.ok) return null

    const arrayBuffer = await fileRes.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), mimeType: meta.mime_type ?? 'application/octet-stream' }
  } catch (err) {
    console.error('[whatsapp/receive] Error al descargar media:', err instanceof Error ? err.message : 'desconocido')
    return null
  }
}
