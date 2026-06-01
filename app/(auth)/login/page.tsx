'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
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
    <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ingresa tu email y contraseña
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && password && handleSubmit()}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && email && handleSubmit()}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        {error !== null && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white
                     hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Verificando…' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
