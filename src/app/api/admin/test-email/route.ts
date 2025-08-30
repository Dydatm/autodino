import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'
import { getUserFromToken } from '@/lib/auth'

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.substring(7) : ''
  if (!!process.env.ADMIN_SETUP_TOKEN && token === process.env.ADMIN_SETUP_TOKEN) return true
  if (!token) return false
  const user = await getUserFromToken(token)
  return !!user?.isAdmin
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ success: false, message: 'Accès refusé' }, { status: 401 })
  }
  const { to } = await request.json()
  if (!to) {
    return NextResponse.json({ success: false, message: 'Paramètre "to" requis' }, { status: 400 })
  }
  const ok = await sendMail({
    to,
    subject: 'Test SMTP AutoDino',
    html: '<p>Test de configuration SMTP AutoDino</p>',
  })
  return NextResponse.json({ success: ok, message: ok ? 'Email de test envoyé' : "Échec d'envoi" })
}


