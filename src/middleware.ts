import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques (pas besoin d'authentification)
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/resend',
    '/api/auth/verify',
  ]

  // Si la route est publique, laisser passer
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Vérifier le token d'authentification
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const token = request.cookies.get('auth-token')?.value || bearer

  // Bypass pour le token de setup admin (pour /api/admin/bootstrap, /api/admin/logs, /api/admin/test-email)
  if (bearer && process.env.ADMIN_SETUP_TOKEN && bearer === process.env.ADMIN_SETUP_TOKEN) {
    return NextResponse.next()
  }

  console.log(`🔍 Middleware pour ${pathname}:`, { 
    hasToken: !!token, 
    tokenPreview: token ? token.substring(0, 50) + '...' : 'none',
    jwtSecret: process.env.JWT_SECRET ? 'défini' : 'non défini'
  })

  if (!token) {
    console.log('❌ Pas de token, redirection vers login')
    // Rediriger vers login si pas de token
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Authentification requise' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Vérifier la validité du token (Edge-safe)
  let payload: { userId?: string; email?: string } | null = null
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key')
    const verified = await jwtVerify<{ userId: string; email: string }>(token, secret)
    const { userId, email } = verified.payload
    payload = { userId, email }
  } catch {
    payload = null
  }
  console.log('🔐 Validation du token:', { isValid: !!payload, payload })
  
  if (!payload) {
    console.log('❌ Token invalide, redirection vers login')
    // Token invalide, rediriger vers login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }
    
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth-token')
    return response
  }

  console.log('✅ Token valide, accès autorisé')

  // Ajouter les infos utilisateur aux headers pour les routes API
  const requestHeaders = new Headers(request.headers)
  if (!payload?.userId || !payload?.email) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Token invalide' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
  requestHeaders.set('x-user-id', payload.userId as string)
  requestHeaders.set('x-user-email', payload.email as string)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}