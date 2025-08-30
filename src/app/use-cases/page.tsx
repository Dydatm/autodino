'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import type { User } from '@/types/auth'

export default function UseCasesPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        router.push('/login')
        return
      }

      const userData = await response.json()
      setUser(userData.user)
    } catch (error) {
      console.error('Erreur:', error)
      router.push('/login')
    }
  }



  const createNewJob = async (kind: string) => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      if (!token) return

      const response = await fetch('/api/jobs/new', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: kind, kind }),
      })

      if (response.ok) {
        const data = await response.json()
        const jobId = data.jobId
        const route = kind === 'Email Extractor' ? `/email-extractor/${jobId}` : kind === 'Nettoyeur de doublons' ? `/duplicate-cleaner/${jobId}` : kind === 'Find Website' ? `/find-website/${jobId}` : `/email-extractor/${jobId}`
        router.push(route)
      }
    } catch (error) {
      console.error('Erreur création job:', error)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1EF' }}>
      <Header user={user} currentPage="use-cases" />

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Use cases</h2>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Email Extractor */}
          <article className="bg-white rounded-2xl shadow p-6 flex flex-col h-full">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <img src="/icon.png" alt="AutoDino" width={18} height={18} />
            </div>
            <h3 className="text-lg font-semibold">Email Extractor</h3>
            <p className="text-sm text-gray-600 mt-2">
              Extrayez automatiquement des emails à partir d&apos;une liste de sites web fournie via un CSV, avec suivi en temps réel et export.
            </p>
            <div className="mt-auto pt-4 flex items-center gap-3">
              <button className="px-4 py-2 rounded-lg border border-green-600 text-green-600 hover:bg-green-50 transition-colors">
                En savoir plus
              </button>
              <button 
                onClick={() => createNewJob('Email Extractor')}
                className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#37A646' }}
              >
                S&apos;en servir
              </button>
            </div>
          </article>

          {/* Card 2: Nettoyeur de doublons */}
          <article className="bg-white rounded-2xl shadow p-6 flex flex-col h-full">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <img src="/icon.png" alt="AutoDino" width={18} height={18} />
            </div>
            <h3 className="text-lg font-semibold">Nettoyeur de doublons</h3>
            <p className="text-sm text-gray-600 mt-2">
              Supprimez les doublons d&apos;un fichier CSV/XLSX (emails, IDs, etc.) en quelques clics.
            </p>
            <div className="mt-auto pt-4 flex items-center gap-3">
              <button className="px-4 py-2 rounded-lg border border-green-600 text-green-600 hover:bg-green-50 transition-colors">
                En savoir plus
              </button>
              <button 
                onClick={() => createNewJob('Nettoyeur de doublons')}
                className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#37A646' }}
              >
                S&apos;en servir
              </button>
            </div>
          </article>

          {/* Card 3: Find Website */}
          <article className="bg-white rounded-2xl shadow p-6 flex flex-col h-full">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <img src="/icon.png" alt="AutoDino" width={18} height={18} />
            </div>
            <h3 className="text-lg font-semibold">Find Website</h3>
            <p className="text-sm text-gray-600 mt-2">
              À partir d’un nom d’entreprise et d’une adresse, retrouvez automatiquement le site web.
            </p>
            <div className="mt-auto pt-4 flex items-center gap-3">
              <button className="px-4 py-2 rounded-lg border border-green-600 text-green-600 hover:bg-green-50 transition-colors">
                En savoir plus
              </button>
              <button 
                onClick={() => createNewJob('Find Website')}
                className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#37A646' }}
              >
                S&apos;en servir
              </button>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}