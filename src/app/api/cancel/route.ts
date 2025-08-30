import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Import depuis start/route.ts pour accéder aux processus actifs
// Note: Dans un vrai projet, on utiliserait un gestionnaire de processus centralisé
import { ChildProcess } from 'child_process'

declare global {
  // eslint-disable-next-line no-var
  var activeProcesses: Map<string, ChildProcess>
}

if (!global.activeProcesses) {
  global.activeProcesses = new Map()
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentification requise' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Job ID requis' },
        { status: 400 }
      )
    }

    const job = await prisma.job.findFirst({
      where: { 
        id: jobId,
        userId,
      },
    })

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job introuvable' },
        { status: 404 }
      )
    }

    if (job.status !== 'running') {
      return NextResponse.json({
        success: true,
        message: 'Job déjà arrêté',
      })
    }

    // Tenter d'arrêter le processus Python s'il existe
    const pythonProcess = global.activeProcesses.get(jobId)
    if (pythonProcess && pythonProcess.pid && !pythonProcess.killed) {
      try {
        pythonProcess.kill('SIGINT')
        console.log(`Processus Python ${jobId} arrêté avec SIGINT`)
      } catch (error) {
        console.warn(`Impossible d'arrêter le processus ${jobId}:`, error)
      }
    }

    // Marquer le job comme annulé
    const currentLogs = (job.logs as string[]) || []
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        endedAt: new Date(),
        logs: [...currentLogs, 'SIGINT envoyé. Arrêt en cours…'],
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Job arrêté avec succès',
    })

  } catch (error) {
    console.error('Erreur lors de l\'arrêt du job:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}