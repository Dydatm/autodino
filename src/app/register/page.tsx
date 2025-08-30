'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstname, lastname }),
      })

      const data = await response.json()

      if (data.success) {
        setIsSuccess(true)
      } else {
        setError(data.message || 'Erreur lors de l\'inscription')
        setShowResend(response.status === 409)
      }
    } catch (err) {
      console.error('Erreur d\'inscription:', err)
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

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F1EF' }}>
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-xl bg-white shadow-lg flex items-center justify-center mb-6">
              <Image src="/icon.png" alt="AutoDino" width={50} height={50} className="rounded-lg" />
            </div>
            <div className="mb-4">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue !</h2>
              <p className="text-lg text-gray-700 mb-2">
                Félicitations ! Vous faites maintenant partie de la <span className="font-bold" style={{ color: '#37A646' }}>Team des Dino&apos;s</span> !
              </p>
              <p className="text-sm text-gray-600">
                Votre compte a été créé avec succès. Il est temps de réveiller votre Dino intérieur !
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#37A646' }}>
                <span className="text-white text-2xl">✓</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Compte créé !</h3>
              <p className="text-gray-700 text-sm mb-2">
                Avant de vous connecter, <span className="font-semibold">vérifiez votre adresse e‑mail</span> :
              </p>
              <ul className="text-gray-600 text-sm list-disc text-left mx-auto" style={{ maxWidth: '28rem' }}>
                <li>Consultez votre boîte de réception à l’adresse fournie</li>
                <li>Ouvrez l’e‑mail de vérification AutoDino</li>
                <li> Cliquez sur le lien pour activer votre compte</li>
              </ul>
            </div>
            
            <button
              onClick={() => router.push('/login')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#37A646' }}
            >
              J’ai vérifié mon e‑mail – Se connecter
            </button>
            
            <p className="mt-4 text-xs text-gray-500">
              Astuce: vérifiez aussi vos courriers indésirables
            </p>
          </div>
        </div>
      </div>
    )
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
            Créer un compte pour devenir un vrai Dino
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
              <div className="text-sm mb-2">Un compte existe déjà avec cet email, mais il n&apos;est peut‑être pas vérifié. Renvoyer l&apos;email de vérification ?</div>
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
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstname" className="block text-sm font-medium text-gray-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                id="firstname"
                name="firstname"
                type="text"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="John"
              />
            </div>
            
            <div>
              <label htmlFor="lastname" className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                id="lastname"
                name="lastname"
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
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
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">
              8 caractères minimum avec majuscule, minuscule et chiffre
            </p>
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
                Création...
              </div>
            ) : (
              'Créer mon compte'
            )}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/login" className="font-medium hover:underline" style={{ color: '#37A646' }}>
                Se connecter
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}