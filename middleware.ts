import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rutas públicas que no requieren autenticación
const PUBLIC_PAGE_PREFIXES = ['/login', '/verify-otp', '/display']

// API routes que no requieren sesión de usuario
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/verify-otp',
  '/api/webhooks/whatsapp'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Archivos estáticos y rutas de API públicas — sin overhead de auth
  if (
    PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)

  const isPublicPage = PUBLIC_PAGE_PREFIXES.some(p => pathname.startsWith(p))

  // Sin sesión fuera de rutas públicas → redirigir a login
  if (!user && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión en login/verify-otp → redirigir al dashboard
  if (user && isPublicPage) {
    return NextResponse.redirect(new URL('/agenda', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
