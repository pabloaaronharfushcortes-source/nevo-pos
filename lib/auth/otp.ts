import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16

function deriveKey(secret: string): Buffer {
  // HKDF simplificado: HMAC-SHA256 con contexto fijo → 32 bytes
  return createHmac('sha256', 'nevo-pos-otp-v1').update(secret).digest()
}

export function generateOtp(): string {
  // 6 dígitos criptográficamente seguros sin sesgo de módulo
  let n: number
  do {
    n = randomBytes(4).readUInt32BE(0)
  } while (n >= 4_000_000_000) // descarta valores que producirían sesgo
  return (n % 1_000_000).toString().padStart(6, '0')
}

export function encryptPending(data: object, secret: string): string {
  const key = deriveKey(secret)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const plaintext = JSON.stringify(data)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Formato: iv (12) ‖ tag (16) ‖ ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

export function decryptPending<T>(token: string, secret: string): T | null {
  try {
    const buf = Buffer.from(token, 'base64url')
    if (buf.length < IV_BYTES + TAG_BYTES + 1) return null
    const iv = buf.subarray(0, IV_BYTES)
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
    const encrypted = buf.subarray(IV_BYTES + TAG_BYTES)
    const key = deriveKey(secret)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return JSON.parse(decrypted.toString('utf8')) as T
  } catch {
    return null
  }
}

export function verifyOtp(submitted: string, stored: string): boolean {
  if (submitted.length !== 6 || stored.length !== 6) return false
  return timingSafeEqual(Buffer.from(submitted, 'utf8'), Buffer.from(stored, 'utf8'))
}
