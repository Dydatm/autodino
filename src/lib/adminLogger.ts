import fs from 'fs'
import path from 'path'

const logsDir = path.join(process.cwd(), 'logs')
const adminLogPath = path.join(logsDir, 'admin.log')

function ensureLogsDir() {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
  } catch {
    // ignore
  }
}

export function logAdmin(message: string, meta?: Record<string, unknown>) {
  try {
    ensureLogsDir()
    const time = new Date().toISOString()
    const line = `[${time}] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`
    fs.appendFileSync(adminLogPath, line)
    // Also mirror to console for hosting logs
    console.log('[ADMIN]', message, meta || '')
  } catch (e) {
    console.error('adminLogger error:', e)
  }
}

export function readAdminLogTail(maxLines = 200): string[] {
  try {
    ensureLogsDir()
    if (!fs.existsSync(adminLogPath)) return []
    const content = fs.readFileSync(adminLogPath, 'utf-8')
    const lines = content.split(/\r?\n/)
    const sliced = lines.slice(Math.max(0, lines.length - maxLines))
    return sliced.filter(Boolean)
  } catch (e) {
    console.error('readAdminLogTail error:', e)
    return []
  }
}


