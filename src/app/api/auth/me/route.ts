import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import type { AuthResponse } from '@/types/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined
    const token = headerToken || cookieToken

    if (!token) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Token d'authentification manquant" },
        { status: 401 }
      )
    }
    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }

    return NextResponse.json<AuthResponse>({
      success: true,
      user,
    })

  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error)
    return NextResponse.json<AuthResponse>(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}