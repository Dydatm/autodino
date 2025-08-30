import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'

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

    return NextResponse.json({
      success: true,
      job,
    })

  } catch (error) {
    console.error('Erreur lors de la récupération du job:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Supprimer les fichiers associés
    const filesToDelete = [
      job.inputPath,
      job.preppedInputPath,
      job.outputPath,
      job.outputPath ? job.outputPath + '.partial' : null,
    ].filter(Boolean) as string[]

    for (const filePath of filesToDelete) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (error) {
        console.warn(`Impossible de supprimer le fichier ${filePath}:`, error)
      }
    }

    // Supprimer le job de la base de données
    await prisma.job.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Job supprimé avec succès',
    })

  } catch (error) {
    console.error('Erreur lors de la suppression du job:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}