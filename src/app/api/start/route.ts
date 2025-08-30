import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import type { StartJobRequest } from '@/types/jobs'

declare global {
  // eslint-disable-next-line no-var
  var activeProcesses: Map<string, ChildProcess>
}

if (!global.activeProcesses) {
  global.activeProcesses = new Map()
}

// Fonction pour Email Extractor
async function runEmailExtraction(jobId: string) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    })

    if (!job || !job.preppedInputPath || !job.outputPath) {
      throw new Error('Job ou fichiers manquants')
    }

    // Mettre à jour le statut à "running"
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'running',
        startedAt: new Date(),
        processedSites: 0,
        emailsFound: 0,
        percent: 0.0,
        logs: ['Démarrage du traitement...'],
      },
    })

    const scriptPath = path.join(process.cwd(), 'scripts', 'find_emails.py')
    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')
    const args = [
      scriptPath,
      job.preppedInputPath,
      job.outputPath,
      '--max-pages', '3'
    ]

    console.log('Commande:', pythonPath, args.join(' '))

    const pythonProcess = spawn(pythonPath, args, {
      stdio: 'pipe',
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })

    global.activeProcesses.set(jobId, pythonProcess)

    const logs: string[] = ['Démarrage du traitement...']
    let processedSites = 0
    let emailsFound = 0
    let totalSites = job.totalSites

    // Parser pour extraire le nombre total de sites
    const parseStartTotal = (line: string): number | null => {
      const match = line.match(/Start:\s*(\d+)\s+sites/)
      return match ? parseInt(match[1]) : null
    }

    // Parser pour détecter la fin de traitement d'un site
    const parseSiteDone = (line: string): { isDone: boolean; emails: number } => {
      if (line.includes('] pages=') && line.includes('emails_collected=')) {
        const match = line.match(/emails_collected=(\d+)/)
        const emails = match ? parseInt(match[1]) : 0
        return { isDone: true, emails }
      }
      return { isDone: false, emails: 0 }
    }

    // Écouter la sortie du script Python
    pythonProcess.stdout?.on('data', async (data) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim())
      
      for (const line of lines) {
        logs.push(line)
        
        // Extraire le nombre total de sites
        const total = parseStartTotal(line)
        if (total && total !== totalSites) {
          totalSites = total
          await prisma.job.update({
            where: { id: jobId },
            data: { totalSites: total },
          })
        }

        // Détecter la fin de traitement d'un site
        const { isDone, emails } = parseSiteDone(line)
        if (isDone) {
          processedSites++
          emailsFound += emails
          
          const percent = totalSites > 0 ? Math.round((processedSites / totalSites) * 100) : 0
          
          await prisma.job.update({
            where: { id: jobId },
            data: {
              processedSites,
              emailsFound,
              percent,
              logs: logs.slice(-100),
            },
          })
        }
      }
    })

    pythonProcess.stderr?.on('data', (data) => {
      console.error('Erreur script Python:', data.toString())
      logs.push(`ERREUR: ${data.toString()}`)
    })

    pythonProcess.on('close', async (code) => {
      global.activeProcesses.delete(jobId)
      
      const finalStatus = code === 0 ? 'done' : (code === 130 ? 'cancelled' : 'error')
      const finalLogs = [...logs.slice(-99)]
      
      if (finalStatus === 'done') {
        finalLogs.push('Terminé ✔')
      } else if (finalStatus === 'cancelled') {
        finalLogs.push('Arrêt demandé. Fichier partiel disponible.')
      } else {
        finalLogs.push(`Erreur ❌ (code: ${code})`)
      }

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          endedAt: new Date(),
          percent: finalStatus === 'done' ? 100 : processedSites > 0 ? Math.round((processedSites / totalSites) * 100) : 0,
          logs: finalLogs,
          returnCode: code,
        },
      })
    })

  } catch (error) {
    console.error('Erreur extraction emails:', error)
    global.activeProcesses.delete(jobId)
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'error',
        endedAt: new Date(),
        logs: [`Exception: ${error}`],
      },
    })
  }
}

// Fonction pour Nettoyeur de doublons
async function runDuplicateCleaner(jobId: string) {
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job || !job.inputPath || !job.outputPath || !job.selectedColumn) {
      throw new Error('Job ou fichiers manquants')
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'running',
        startedAt: new Date(),
        processedSites: 0,
        emailsFound: 0,
        percent: 0.0,
        logs: ['Démarrage du nettoyage...'],
      },
    })

    const scriptPath = path.join(process.cwd(), 'scripts', 'deduplicate.py')
    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')
    const args = [
      scriptPath,
      job.inputPath,
      job.outputPath,
      '--column', job.selectedColumn,
    ]

    const pythonProcess = spawn(pythonPath, args, {
      stdio: 'pipe',
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })

    global.activeProcesses.set(jobId, pythonProcess)

    const logs: string[] = ['Démarrage du nettoyage...']

    pythonProcess.stdout?.on('data', async (data) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim())
      for (const line of lines) {
        logs.push(line)
        // Parse progress markers from deduplicate.py
        if (line.startsWith('DEDUP_TOTAL=')) {
          const total = parseInt(line.split('=')[1] || '0')
          if (!isNaN(total)) {
            await prisma.job.update({ where: { id: jobId }, data: { totalSites: total } })
          }
        }
        if (line.startsWith('DEDUP_PROGRESS=')) {
          const parts = line.split('=')[1].split(',')
          const processed = parseInt(parts[0]||'0')
          const kept = parseInt(parts[1]||'0')
          const removed = parseInt(parts[2]||'0')
          const percent = job.totalSites && job.totalSites>0 ? Math.round((processed / job.totalSites) * 100) : 0
          await prisma.job.update({ where: { id: jobId }, data: { processedSites: processed, emailsFound: removed, percent } })
        }
        if (line.startsWith('DEDUP_REMOVED=')) {
          const removed = parseInt(line.split('=')[1] || '0')
          await prisma.job.update({ where: { id: jobId }, data: { emailsFound: removed } })
        }
        if (line.startsWith('DEDUP_FINAL=')) {
          const finalCount = parseInt(line.split('=')[1] || '0')
          logs.push(`Final: ${finalCount} lignes`) 
        }

        await prisma.job.update({ where: { id: jobId }, data: { logs: logs.slice(-100) } })
      }
    })

    pythonProcess.stderr?.on('data', (data) => {
      logs.push(`ERREUR: ${data.toString()}`)
    })

    pythonProcess.on('close', async (code) => {
      global.activeProcesses.delete(jobId)
      const finalStatus = code === 0 ? 'done' : (code === 130 ? 'cancelled' : 'error')
      const finalLogs = [...logs.slice(-99)]
      if (finalStatus === 'done') finalLogs.push('Terminé ✔')
      if (finalStatus === 'cancelled') finalLogs.push('Arrêt demandé.')
      if (finalStatus === 'error') finalLogs.push(`Erreur ❌ (code: ${code})`)

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          endedAt: new Date(),
          percent: finalStatus === 'done' ? 100 : 0,
          logs: finalLogs,
        },
      })
    })
  } catch (error) {
    console.error('Erreur dédoublonnage:', error)
    global.activeProcesses.delete(jobId)
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'error', endedAt: new Date(), logs: [`Exception: ${error}`] },
    })
  }
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

    const body: StartJobRequest = await request.json()
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

    if (!['ready', 'idle', 'error', 'done', 'cancelled'].includes(job.status)) {
      return NextResponse.json(
        { success: false, message: 'Job non prêt pour démarrage' },
        { status: 400 }
      )
    }

    if (!job.preppedInputPath) {
      return NextResponse.json(
        { success: false, message: 'Configuration incomplète (CSV préparé manquant)' },
        { status: 400 }
      )
    }

    // Démarrer le traitement en arrière-plan selon le type
    if (job.kind === 'Nettoyeur de doublons') {
      runDuplicateCleaner(jobId).catch(console.error)
    } else if (job.kind === 'Find Website') {
      // Exécuter le script find_website.py
      try {
        const refreshed = await prisma.job.findUnique({ where: { id: jobId } })
        if (!refreshed || !refreshed.preppedInputPath || !refreshed.outputPath) throw new Error('Fichiers manquants')
        await prisma.job.update({ where: { id: jobId }, data: { status: 'running', startedAt: new Date(), percent: 0, logs: ['Démarrage de la recherche de sites...'] } })
        const scriptPath = path.join(process.cwd(), 'scripts', 'find_website.py')
        const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')
        const args = [ scriptPath, refreshed.preppedInputPath, refreshed.outputPath, '--company', refreshed.selectedColumn || 'company', '--address', 'address' ]
        const pythonProcess = spawn(pythonPath, args, { stdio: 'pipe', env: { ...process.env, PYTHONUNBUFFERED: '1' } })
        global.activeProcesses.set(jobId, pythonProcess)
        const logs: string[] = ['Démarrage de la recherche de sites...']
        let processed = 0
        let total = 0
        pythonProcess.stdout?.on('data', async (data) => {
          const lines = data.toString().split('\n').filter(Boolean)
          for (const line of lines) {
            logs.push(line)
            if (line.startsWith('FIND_PROGRESS=')) {
              processed = parseInt(line.split('=')[1]||'0')
              const percent = total>0 ? Math.round((processed/total)*100) : 0
              await prisma.job.update({ where: { id: jobId }, data: { processedSites: processed, percent, logs: logs.slice(-100) } })
            }
            if (line.startsWith('FIND_TOTAL=')) {
              total = parseInt(line.split('=')[1]||'0')
              await prisma.job.update({ where: { id: jobId }, data: { totalSites: total, logs: logs.slice(-100) } })
            }
          }
        })
        pythonProcess.stderr?.on('data', (d)=> logs.push(`ERREUR: ${d.toString()}`))
        pythonProcess.on('close', async (code)=>{
          global.activeProcesses.delete(jobId)
          const finalStatus = code === 0 ? 'done' : (code === 130 ? 'cancelled' : 'error')
          await prisma.job.update({ where: { id: jobId }, data: { status: finalStatus, endedAt: new Date(), percent: finalStatus==='done'?100:0, logs: logs.slice(-100) } })
        })
      } catch (e) {
        console.error(e)
        await prisma.job.update({ where: { id: jobId }, data: { status: 'error', endedAt: new Date(), logs: ['Exception: '+e] } })
      }
    } else {
      runEmailExtraction(jobId).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      message: 'Job démarré avec succès',
    })

  } catch (error) {
    console.error('Erreur lors du démarrage du job:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}