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

    // Vérifier si le fichier de sortie existe
    let filePath: string | null = null
    let fileName = 'output.csv'

    if (job.outputPath && fs.existsSync(job.outputPath)) {
      filePath = job.outputPath
    } else if (job.outputPath && fs.existsSync(job.outputPath + '.partial')) {
      filePath = job.outputPath + '.partial'
      fileName = 'output.partial.csv'
    }

    if (!filePath) {
      return NextResponse.json(
        { success: false, message: 'Aucun fichier à télécharger' },
        { status: 404 }
      )
    }

    // Lire le fichier
    const fileBuffer = fs.readFileSync(filePath)
    
    // Déterminer un nom de fichier basé sur le nom du job
    try {
      const { default: slugify } = await import('slugify')
      const safeName = slugify(job.name || 'resultat', { lower: true, strict: true })
      fileName = fileName.startsWith('output') ? `${safeName}.csv` : fileName
    } catch {}

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })

  } catch (error) {
    console.error('Erreur lors du téléchargement:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}