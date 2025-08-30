import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendMail } from '@/lib/mailer'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`resend:${ip}`, 3, 60_000 * 60)
    if (!rl.ok) return NextResponse.json({ success: false, message: `Trop de tentatives. Réessayez dans ${rl.retryAfter}s.` }, { status: 429 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ success: false, message: 'Email requis' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) return NextResponse.json({ success: true, message: 'Si le compte existe, un email a été envoyé.' })
    if (user.isVerified) return NextResponse.json({ success: true, message: 'Compte déjà vérifié.' })

    const verificationToken = crypto.randomBytes(24).toString('hex')
    const verificationExpires = new Date(Date.now() + 1000 * 60 * 30)
    await prisma.user.update({ where: { id: user.id }, data: { verificationToken, verificationExpires } })

    const host = process.env.PUBLIC_BASE_URL || 'http://test.dylanisn.ovh'
    const verifyUrl = `${host}/api/auth/verify?token=${verificationToken}`

    await sendMail({
      to: user.email,
      subject: 'Renvoyer la vérification e-mail',
      html: `<p>Pour activer votre compte AutoDino, cliquez ici: <a href=\"${verifyUrl}\">${verifyUrl}</a></p>`
    })

    return NextResponse.json({ success: true, message: 'Email envoyé si le compte existe.' })
  } catch (e) {
    console.error('Erreur resend:', e)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
