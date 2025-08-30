import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params
    if (!userId) return NextResponse.json({ success: false, message: 'Authentification requise' }, { status: 401 })

    const body = await request.json()
    const name = (body?.name || '').toString().trim()
    if (!name) return NextResponse.json({ success: false, message: 'Nom requis' }, { status: 400 })

    const job = await prisma.job.findFirst({ where: { id, userId } })
    if (!job) return NextResponse.json({ success: false, message: 'Job introuvable' }, { status: 404 })

    await prisma.job.update({ where: { id }, data: { name } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur renommage job:', error)
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 })
  }
}


