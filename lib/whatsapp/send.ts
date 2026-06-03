// Envío de mensajes salientes vía Meta WhatsApp Cloud API.
// Las credenciales viven por-tenant en la tabla tenants (multi-tenant);
// el access token y phone_number_id se pasan explícitamente.

type SendTextParams = {
  phoneNumberId: string
  accessToken: string
  to: string            // WAID del destinatario
  text: string
}

type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }

const GRAPH_VERSION = 'v21.0'

// Envía un mensaje de texto. Devuelve el message id de Meta para deduplicación.
export async function sendWhatsAppText(params: SendTextParams): Promise<SendResult> {
  const { phoneNumberId, accessToken, to, text } = params

  if (!phoneNumberId || !accessToken) {
    return { ok: false, error: 'Credenciales de WhatsApp no configuradas' }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: text },
        }),
      }
    )

    if (!res.ok) {
      // No logueamos el contenido del mensaje (regla de seguridad 7), solo el status
      return { ok: false, error: `WhatsApp API respondió ${res.status}` }
    }

    const data = await res.json() as { messages?: Array<{ id: string }> }
    const messageId = data.messages?.[0]?.id
    if (!messageId) return { ok: false, error: 'Respuesta de WhatsApp sin message id' }

    return { ok: true, messageId }
  } catch (err) {
    console.error('[whatsapp/send] Error de red:', err instanceof Error ? err.message : 'desconocido')
    return { ok: false, error: 'Error de red al enviar el mensaje' }
  }
}
