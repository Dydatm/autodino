import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentification requise' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const jobId = formData.get('job_id') as string

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Aucun fichier reçu' },
        { status: 400 }
      )
    }

    const lower = file.name.toLowerCase()
    const isCsv = lower.endsWith('.csv')
    const isXlsx = lower.endsWith('.xlsx') || lower.endsWith('.xls')

    if (!isCsv && !isXlsx) {
      return NextResponse.json(
        { success: false, message: 'Veuillez envoyer un fichier .csv ou .xlsx' },
        { status: 400 }
      )
    }

    // Créer le répertoire uploads s'il n'existe pas
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    let job
    if (jobId) {
      // Utiliser un job existant
      job = await prisma.job.findFirst({
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
    } else {
      // Créer un nouveau job
      job = await prisma.job.create({
        data: {
          name: 'Email Extractor',
          kind: 'Email Extractor',
          userId,
          status: 'idle',
          logs: [],
        },
      })
    }

    // Sauvegarder le fichier
    const inputPath = path.join(uploadsDir, `${job.id}_input${isXlsx ? '.xlsx' : '.csv'}`)
    const outputPath = path.join(uploadsDir, `${job.id}_output.csv`)
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(inputPath, buffer)

    // Lire les colonnes du CSV
    let columns: string[] = []
    try {
      if (isCsv) {
        const csvContent = buffer.toString('utf-8')
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
        }) as Record<string, string>[]
        if (records.length > 0) {
          columns = Object.keys(records[0]).filter(col => col.trim())
        }
      } else {
        const wb = XLSX.read(buffer, { type: 'buffer' })
        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, string>[]
        if (json.length > 0) {
          columns = Object.keys(json[0]).filter(col => col.trim())
        }
      }
    } catch {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la lecture du CSV' },
        { status: 400 }
      )
    }

    // Mettre à jour le job avec les informations du fichier
    await prisma.job.update({
      where: { id: job.id },
      data: {
        inputPath,
        outputPath,
        columns,
        status: 'idle',
      },
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      columns,
    })

  } catch (error) {
    console.error('Erreur lors de l\'upload:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}