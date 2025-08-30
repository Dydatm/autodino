import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { CreateJobRequest } from '@/types/jobs'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentification requise' },
        { status: 401 }
      )
    }

    const body: CreateJobRequest = await request.json()
    const { name, kind } = body

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nom du job requis' },
        { status: 400 }
      )
    }

    const job = await prisma.job.create({
      data: {
        name,
        kind: kind || 'Email Extractor',
        userId,
        status: 'idle',
        logs: [],
      },
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      job,
    })

  } catch (error) {
    console.error('Erreur lors de la création du job:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}