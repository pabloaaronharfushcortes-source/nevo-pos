type OtpEmailParams = {
  to: string
  name: string
  otp: string
}

export async function sendOtpEmail({ to, name, otp }: OtpEmailParams): Promise<void> {
  // En desarrollo: imprimir en consola — no se necesita SMTP real
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP para ${to} (${name}): ${otp}`)
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY no configurado para envío de emails')

  const fromName = process.env.EMAIL_FROM_NAME ?? 'NEVO-POS'
  const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@nevo-pos.app'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to,
      subject: `Tu código de verificación: ${otp}`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
          <p>Hola ${name},</p>
          <p>Ingresa este código para acceder:</p>
          <p style="font-size:40px;font-weight:700;letter-spacing:12px;text-align:center;
                    color:#111;padding:16px 0">${otp}</p>
          <p style="color:#666;font-size:14px">Expira en 5 minutos. No lo compartas.</p>
        </div>
      `
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}
