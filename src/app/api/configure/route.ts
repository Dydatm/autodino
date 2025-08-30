import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import slugify from 'slugify'
import type { ConfigureJobRequest } from '@/types/jobs'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentification requise' },
        { status: 401 }
      )
    }

    const body: ConfigureJobRequest = await request.json()
    const { jobId, name, urlColumn, column, companyColumn, addressColumn } = body

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Job ID manquant' },
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

    if (!job.inputPath || !fs.existsSync(job.inputPath)) {
      return NextResponse.json(
        { success: false, message: 'Fichier d\'entrée manquant' },
        { status: 400 }
      )
    }

    // Préparer un CSV pour l'étape suivante (ou passer l'input tel quel pour certains jobs)
    const uploadsDir = path.join(process.cwd(), 'uploads')
    const preppedPath = path.join(uploadsDir, `${job.id}_prepared.csv`)
    const safeName = name ? slugify(name, { lower: true, strict: true }) : slugify(job.name || 'resultat', { lower: true, strict: true })
    const outputPath = path.join(uploadsDir, `${safeName}_${job.id}.csv`)

    try {
      // Lire CSV ou XLSX
      let records: Record<string, string>[] = []
      if (job.inputPath.toLowerCase().endsWith('.csv')) {
        const csvContent = fs.readFileSync(job.inputPath, 'utf-8')
        records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[]
      } else {
        // XLSX
        const buf = fs.readFileSync(job.inputPath)
        const XLSX = await import('xlsx')
        const wb = XLSX.read(buf, { type: 'buffer' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        records = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, string>[]
      }

      const chosenColumn = urlColumn || column
      const isDuplicate = !!column && (job.kind === 'Nettoyeur de doublons' || job.kind === 'Détecteur de doublons')
      const isFindWebsite = !!companyColumn && !!addressColumn && job.kind === 'Find Website'

      if (!chosenColumn && !isFindWebsite) {
        return NextResponse.json(
          { success: false, message: 'Paramètres de configuration insuffisants' },
          { status: 400 }
        )
      }

      let processedRecords: Record<string, string>[] = records
      if (job.kind === 'Email Extractor') {
        processedRecords = records.map((row) => {
          const newRow = { ...row }
          if (!newRow.website) newRow.website = row[chosenColumn!] || ''
          return newRow
        })
      } else if (isFindWebsite) {
        // Normaliser les colonnes pour le script find_website.py
        processedRecords = records.map((row) => {
          return {
            company: row[companyColumn] || '',
            address: row[addressColumn] || '',
          }
        })
      } else if (isDuplicate) {
        // Pour le dédoublonnage, on garde le fichier tel quel et on enregistre juste la colonne
        processedRecords = records
      }

      const csvOutput = stringify(processedRecords, { header: true, bom: true })
      fs.writeFileSync(preppedPath, csvOutput)

      const totalSites = processedRecords.length

      // Mettre à jour le job
      await prisma.job.update({
        where: { id: jobId },
        data: {
          name,
          selectedColumn: isFindWebsite ? companyColumn : chosenColumn,
          preppedInputPath: (job.kind === 'Nettoyeur de doublons' || job.kind === 'Détecteur de doublons') ? job.inputPath : preppedPath,
          outputPath,
          status: 'ready',
          totalSites,
          processedSites: 0,
          emailsFound: 0,
          percent: 0.0,
          logs: ['Configuration terminée'],
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Configuration terminée avec succès',
      })

    } catch (error) {
      console.error('Erreur lors de la préparation du CSV:', error)
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la préparation du CSV' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Erreur lors de la configuration:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}