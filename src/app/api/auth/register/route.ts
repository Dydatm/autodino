import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth'
import type { RegisterRequest, AuthResponse } from '@/types/auth'
import crypto from 'crypto'
import { sendMail } from '@/lib/mailer'
import disposableDomains from 'disposable-email-domains'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`register:${ip}`, 3, 60_000 * 60)
    if (!rl.ok) return NextResponse.json<AuthResponse>({ success: false, message: `Trop de tentatives. Réessayez dans ${rl.retryAfter}s.` }, { status: 429 })

    const body: RegisterRequest & { trap?: string } = await request.json()
    const { email, password, firstname, lastname, trap } = body

    // Honeypot (champ caché jamais rempli par humains)
    if (trap && trap.trim().length > 0) {
      return NextResponse.json<AuthResponse>({ success: false, message: 'Détection bot' }, { status: 400 })
    }

    // Validation
    if (!email || !password) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Format email invalide' },
        { status: 400 }
      )
    }

    // Bloquer domaines jetables
    const domain = email.split('@')[1]?.toLowerCase()
    if (domain && disposableDomains.includes(domain)) {
      console.warn('Tentative avec domaine jetable:', domain, email)
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Domaine email non autorisé' },
        { status: 400 }
      )
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: passwordValidation.errors.join(', ') },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: 'Un compte existe déjà avec cet email' },
        { status: 409 }
      )
    }

    // Créer l'utilisateur avec token de vérification
    const hashedPassword = await hashPassword(password)
    const verificationToken = crypto.randomBytes(24).toString('hex')
    const verificationExpires = new Date(Date.now() + 1000 * 60 * 30) // 30 min

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstname,
        lastname,
        isVerified: false,
        verificationToken,
        verificationExpires,
      },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        isVerified: true,
        isAdmin: true,
      },
    })

    // Envoyer l'email de vérification si SMTP configuré
    const host = process.env.PUBLIC_BASE_URL || 'http://test.dylanisn.ovh'
    const verifyUrl = `${host}/api/auth/verify?token=${verificationToken}`
    await sendMail({
      to: user.email,
      subject: 'Vérifiez votre adresse e-mail',
      html: `<p>Bienvenue sur AutoDino !</p><p>Pour activer votre compte, cliquez ici: <a href=\"${verifyUrl}\">${verifyUrl}</a></p>`
    })

    return NextResponse.json<AuthResponse>({
      success: true,
      message: "Compte créé. Vérifiez votre e-mail pour l'activer.",
      user: { id: user.id, email: user.email, firstname: user.firstname || undefined, lastname: user.lastname || undefined, createdAt: new Date() },
    })

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error)
    return NextResponse.json<AuthResponse>(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}