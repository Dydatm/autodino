import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken, validateEmail } from '@/lib/auth'
import type { LoginRequest, AuthResponse } from '@/types/auth'
import { rateLimit } from '@/lib/rateLimit'
import { logAdmin } from '@/lib/adminLogger'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`login:${ip}`, 5, 60_000)
    if (!rl.ok) return NextResponse.json<AuthResponse>({ success: false, message: `Trop de tentatives. Réessayez dans ${rl.retryAfter}s.` }, { status: 429 })

    const body: LoginRequest = await request.json()
    const { email, password } = body

    if (!email || !password || !validateEmail(email)) {
      return NextResponse.json<AuthResponse>({ success: false, message: 'Identifiants invalides' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) return NextResponse.json<AuthResponse>({ success: false, message: 'Email ou mot de passe incorrect' }, { status: 401 })

    // Exiger la vérification pour tous, sauf pour les admins (bootstrap)
    if (!user.isVerified && !user.isAdmin) {
      logAdmin('Login refused: unverified account', { email })
      return NextResponse.json<AuthResponse>({ success: false, message: 'Compte non vérifié. Veuillez valider votre e‑mail.' }, { status: 403 })
    }

    const isValid = await verifyPassword(password, user.password)
    if (!isValid) return NextResponse.json<AuthResponse>({ success: false, message: 'Email ou mot de passe incorrect' }, { status: 401 })

    const token = generateToken({ userId: user.id, email: user.email })
    logAdmin('Login success', { email, isAdmin: user.isAdmin })
    return NextResponse.json<AuthResponse>({ success: true, message: 'Connexion réussie', token })
  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
    return NextResponse.json<AuthResponse>({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}