import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function POST(
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

    const sourceJob = await prisma.job.findFirst({
      where: { 
        id,
        userId,
      },
    })

    if (!sourceJob) {
      return NextResponse.json(
        { success: false, message: 'Job source introuvable' },
        { status: 404 }
      )
    }

    // Créer le nouveau job
    const newJob = await prisma.job.create({
      data: {
        name: sourceJob.name,
        kind: sourceJob.kind,
        userId,
        status: 'idle',
        columns: (sourceJob.columns ?? undefined) as unknown as object,
        selectedColumn: sourceJob.selectedColumn ?? undefined,
        logs: [`Dupliqué depuis ${id}`],
      },
    })

    // Créer le répertoire uploads s'il n'existe pas
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Copier les fichiers si ils existent
    try {
      if (sourceJob.inputPath && fs.existsSync(sourceJob.inputPath)) {
        const newInputPath = path.join(uploadsDir, `${newJob.id}_input.csv`)
        fs.copyFileSync(sourceJob.inputPath, newInputPath)
        
        await prisma.job.update({
          where: { id: newJob.id },
          data: { inputPath: newInputPath },
        })
      }

      if (sourceJob.preppedInputPath && fs.existsSync(sourceJob.preppedInputPath)) {
        const newPreppedPath = path.join(uploadsDir, `${newJob.id}_prepared.csv`)
        fs.copyFileSync(sourceJob.preppedInputPath, newPreppedPath)
        
        await prisma.job.update({
          where: { id: newJob.id },
          data: { 
            preppedInputPath: newPreppedPath,
            status: 'ready',
          },
        })
      }
    } catch (error) {
      console.warn('Erreur lors de la copie des fichiers:', error)
    }

    return NextResponse.json({
      success: true,
      jobId: newJob.id,
      job: newJob,
    })

  } catch (error) {
    console.error('Erreur lors de la duplication du job:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}