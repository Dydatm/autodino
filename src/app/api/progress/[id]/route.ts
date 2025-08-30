import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { JobProgress } from '@/types/jobs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentification requise' },
        { status: 401 }
      )
    }

    const job = await prisma.job.findFirst({
      where: { 
        id,
        userId,
      },
    })

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job introuvable' },
        { status: 404 }
      )
    }

    const progress: JobProgress = {
      status: job.status,
      name: job.name,
      totalSites: job.totalSites,
      processedSites: job.processedSites,
      emailsFound: job.emailsFound,
      percent: job.percent,
      log: (job.logs as string[]) || [],
      hasConfig: Boolean(job.preppedInputPath),
    }

    return NextResponse.json(progress)

  } catch (error) {
    console.error('Erreur lors de la récupération du progrès:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}