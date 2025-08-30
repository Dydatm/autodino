import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || ''
    if (!token) return NextResponse.json({ success: false, message: 'Token manquant' }, { status: 400 })

    const user = await prisma.user.findFirst({ where: { verificationToken: token } })
    if (!user) return NextResponse.json({ success: false, message: 'Token invalide' }, { status: 400 })

    if (user.verificationExpires && user.verificationExpires < new Date()) {
      return NextResponse.json({ success: false, message: 'Token expiré' }, { status: 400 })
    }

    await prisma.user.update({ where: { id: user.id }, data: { isVerified: true, verificationToken: null, verificationExpires: null } })

    // Option UX: rediriger vers /login avec query
    const base = process.env.PUBLIC_BASE_URL || 'http://test.dylanisn.ovh'
    return NextResponse.redirect(`${base}/login?verified=1`)
  } catch (e) {
    console.error('Erreur vérification email:', e)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
