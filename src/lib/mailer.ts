import nodemailer, { Transporter, type SentMessageInfo } from 'nodemailer'
import { logAdmin } from './adminLogger'

interface SendMailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

function buildTransporter(): Transporter | null {
  try {
    const smtpUrl = process.env.SMTP_URL
    if (smtpUrl) {
      logAdmin('SMTP using SMTP_URL')
      return nodemailer.createTransport(smtpUrl)
    }

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = Number(process.env.SMTP_PORT || 587)
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (smtpHost && smtpUser && smtpPass) {
      logAdmin('SMTP using host/port auth', { smtpHost, smtpPort })
      return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })
    }

    logAdmin('SMTP not configured')
    return null
  } catch (error) {
    logAdmin('Erreur création transport SMTP', { error: String(error) })
    return null
  }
}

export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const transporter = buildTransporter()
  if (!transporter) {
    logAdmin('sendMail skipped: SMTP non configuré', { to: options.to, subject: options.subject })
    return false
  }

  try {
    const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@localhost'
    const replyTo = process.env.REPLY_TO || undefined
    const info: SentMessageInfo = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo,
    })
    logAdmin('sendMail OK', { to: options.to, subject: options.subject, messageId: (info as SentMessageInfo).messageId })
    return true
  } catch (error) {
    logAdmin('Erreur envoi mail', { to: options.to, subject: options.subject, error: String(error) })
    return false
  }
}


