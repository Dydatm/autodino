'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResend, setShowResend] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success && data.token) {
        // Stocker le token dans un cookie
        const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60 // 30 jours si "rester connecté", sinon 7 jours
        const isSecure = window.location.protocol === 'https:' ? '; secure' : ''
        document.cookie = `auth-token=${data.token}; path=/; max-age=${maxAge}${isSecure}; samesite=strict`
        
        // Redirection avec un petit délai pour s'assurer que le cookie est défini
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 100)
      } else {
        setError(data.message || 'Email ou mot de passe incorrect')
        setShowResend(response.status === 403)
      }
    } catch (err) {
      console.error('Erreur de connexion:', err)
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setResendMsg('')
    try {
      const resp = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await resp.json()
      setResendMsg(data.message || (resp.ok ? 'Email de vérification renvoyé.' : "Impossible d'envoyer l'email."))
    } catch {
      setResendMsg("Erreur lors de l\'envoi. Réessayez plus tard.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F1EF' }}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-xl bg-white shadow-lg flex items-center justify-center mb-4">
            <Image src="/icon.png" alt="AutoDino" width={40} height={40} className="rounded-lg" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">AutoDino V1</h2>
          <p className="mt-2 text-sm text-gray-600">
            Réveillez le Dino qui sommeille en vous !
          </p>
        </div>
        
        <form className="bg-white rounded-2xl shadow-xl p-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {showResend && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              <div className="text-sm mb-2">Votre compte n&apos;est pas encore vérifié. Renvoyer l&apos;email de vérification ?</div>
              <button
                type="button"
                onClick={handleResend}
                className="mt-1 inline-flex items-center px-3 py-2 rounded-md text-white text-sm"
                style={{ backgroundColor: '#37A646' }}
              >
                Renvoyer l&apos;email
              </button>
              {resendMsg && <div className="mt-2 text-xs text-gray-700">{resendMsg}</div>}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-green-500"
              style={{ accentColor: '#37A646' }}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Rester connecté
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: '#37A646' }}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connexion...
              </div>
            ) : (
              'Se connecter'
            )}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Link href="/register" className="font-medium hover:underline" style={{ color: '#37A646' }}>
                S&apos;inscrire
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}