'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const DIGITS = 6

export default function VerifyOtpPage() {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(DIGITS).fill(null))

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1)
    setDigits(next)
    if (value && index < DIGITS - 1) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS)
    if (!pasted) return
    e.preventDefault()
    const next = [...digits]
    pasted.split('').forEach((d, i) => { next[i] = d })
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, DIGITS - 1)]?.focus()
  }

  async function handleSubmit() {
    const code = digits.join('')
    if (code.length !== DIGITS) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    const data = await res.json() as { status?: string; error?: string; redirect?: string }

    if (!res.ok) {
      if (data.redirect) {
        router.push(`${data.redirect}?error=${encodeURIComponent(data.error ?? 'Sesión expirada por intentos fallidos.')}`)
        return
      }
      setError(data.error ?? 'Código incorrecto')
      setLoading(false)
      setDigits(Array(DIGITS).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 0)
      return
    }

    router.push('/agenda')
  }

  const isFull = digits.every(d => d !== '')

  return (
    <div className="w-full max-w-sm">
      {/* Mobile brand */}
      <div className="md:hidden text-center mb-8">
        <p className="font-display text-4xl font-semibold" style={{ color: '#0E0D1A' }}>NEVO</p>
        <p className="text-sm mt-1" style={{ color: '#A259FF' }}>POS</p>
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold" style={{ color: '#0E0D1A' }}>
          Verificación
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#6B6B8A' }}>
          Ingresa el código de 6 dígitos enviado a tu correo
        </p>
      </div>

      {/* OTP inputs */}
      <div className="mt-8 flex gap-2 justify-center">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-12 h-14 text-center text-2xl font-semibold bg-[#FAFAFA] border-[1.5px] border-[#EDEDED] focus:border-[#A259FF] focus:outline-none transition-colors"
            style={{ borderRadius: '10px', color: '#0E0D1A' }}
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-center px-3 py-2 rounded" style={{ background: '#FFF0F0', color: '#E85555' }}>
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={loading || !isFull}
          className="w-full py-3 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#FF6B6B', borderRadius: '8px' }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
          onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
        >
          {loading ? 'Verificando…' : 'Confirmar'}
        </button>

        <button
          onClick={() => router.push('/login')}
          className="w-full py-2.5 text-sm font-medium transition-colors"
          style={{ color: '#6B6B8A' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A259FF' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B6B8A' }}
        >
          Volver al inicio de sesión
        </button>
      </div>

      <p className="mt-10 text-center text-xs" style={{ color: '#9B9BB0' }}>
        Powered by NEVO
      </p>
    </div>
  )
}
