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
      body: JSON.stringify({ code })
    })

    const data = await res.json() as { status?: string; error?: string }

    if (!res.ok) {
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
    <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Verificación</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ingresa el código de 6 dígitos enviado a tu correo
        </p>
      </div>

      <div className="flex gap-2 justify-center">
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
            className="w-11 h-12 text-center text-xl font-semibold rounded-md border border-gray-300
                       shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        ))}
      </div>

      {error !== null && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !isFull}
        className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white
                   hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Verificando…' : 'Confirmar'}
      </button>

      <button
        onClick={() => router.push('/login')}
        className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Volver al inicio de sesión
      </button>
    </div>
  )
}
