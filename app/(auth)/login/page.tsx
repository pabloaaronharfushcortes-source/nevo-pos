'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const inputCls = `
  mt-1.5 block w-full px-4 py-2.5 text-sm
  bg-[#FAFAFA] border-[1.5px] border-[#EDEDED]
  focus:border-[#A259FF] focus:outline-none focus:ring-0
  transition-colors
`

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const queryError = params.get('error')
    if (queryError) setError(queryError)
  }, [])

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json() as { status?: string; error?: string }

    if (!res.ok) {
      setError(data.error ?? 'Error al iniciar sesión')
      setLoading(false)
      return
    }

    router.push('/verify-otp')
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mobile brand */}
      <div className="md:hidden text-center mb-8">
        <p className="font-display text-4xl font-semibold" style={{ color: '#0E0D1A' }}>NEVO</p>
        <p className="text-sm mt-1" style={{ color: '#A259FF' }}>POS</p>
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold" style={{ color: '#0E0D1A' }}>
          Bienvenido de vuelta
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#6B6B8A' }}>
          Ingresa tus credenciales para acceder
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium" style={{ color: '#0E0D1A' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && password && handleSubmit()}
            className={inputCls}
            style={{ borderRadius: '8px', color: '#0E0D1A' }}
            placeholder="hola@negocio.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#0E0D1A' }}>
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && email && handleSubmit()}
            className={inputCls}
            style={{ borderRadius: '8px', color: '#0E0D1A' }}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded" style={{ background: '#FFF0F0', color: '#E85555' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          className="w-full py-3 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: loading ? '#E85555' : '#FF6B6B', borderRadius: '8px' }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#E85555' }}
          onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#FF6B6B' }}
        >
          {loading ? 'Verificando…' : 'Continuar'}
        </button>
      </div>

      <p className="mt-10 text-center text-xs" style={{ color: '#9B9BB0' }}>
        Powered by NEVO
      </p>
    </div>
  )
}
