import OpenAI from 'openai'
import { toFile } from 'openai/uploads'

// Transcribe una nota de voz de WhatsApp con OpenAI Whisper.
// Devuelve null si falla — el agente continúa pidiendo que escriban el mensaje.
export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[whisper] OPENAI_API_KEY no configurada')
    return null
  }

  try {
    const openai = new OpenAI({ apiKey })
    // WhatsApp envía audio en ogg/opus; Whisper acepta el formato vía nombre de archivo
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'ogg'
    const file = await toFile(buffer, `audio.${ext}`, { type: mimeType })

    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'es',
    })

    return result.text?.trim() || null
  } catch (err) {
    console.error('[whisper] Error de transcripción:', err instanceof Error ? err.message : 'desconocido')
    return null
  }
}
