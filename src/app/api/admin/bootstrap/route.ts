import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth'
import { logAdmin } from '@/lib/adminLogger'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined
    const setupToken = process.env.ADMIN_SETUP_TOKEN

    if (!setupToken || !token || token !== setupToken) {
      return NextResponse.json({ success: false, message: 'Accès refusé' }, { status: 401 })
    }

    const { email, password, firstname, lastname } = await request.json()

    if (!email || !password || !validateEmail(email)) {
      return NextResponse.json({ success: false, message: 'Email/mot de passe invalides' }, { status: 400 })
    }
    const pwd = validatePassword(password)
    if (!pwd.isValid) {
      return NextResponse.json({ success: false, message: pwd.errors.join(', ') }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { isAdmin: true, isVerified: true },
        select: { id: true, email: true, isAdmin: true }
      })
      logAdmin('Bootstrap admin: updated existing', { email })
      return NextResponse.json({ success: true, message: 'Admin mis à jour', user: updated })
    }

    const hashed = await hashPassword(password)
    const created = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashed,
        firstname,
        lastname,
        isAdmin: true,
        isVerified: true,
      },
      select: { id: true, email: true, isAdmin: true }
    })
    logAdmin('Bootstrap admin: created', { email })
    return NextResponse.json({ success: true, message: 'Admin créé', user: created })
  } catch (error) {
    logAdmin('Erreur bootstrap admin', { error: String(error) })
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}


