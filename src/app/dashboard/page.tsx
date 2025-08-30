'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import type { User } from '@/types/auth'
import type { Job } from '@/types/jobs'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchUserAndJobs()
  }, [])

  const fetchUserAndJobs = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      if (!token) {
        router.push('/login')
        return
      }

      // Récupérer les informations utilisateur
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!userResponse.ok) {
        router.push('/login')
        return
      }

      const userData = await userResponse.json()
      setUser(userData.user)

      // Récupérer les jobs
      const jobsResponse = await fetch('/api/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setJobs(jobsData.jobs || [])
      }

    } catch (error) {
      console.error('Erreur:', error)
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }



  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      idle: 'EN ATTENTE',
      ready: 'PRÊT',
      running: 'EN COURS',
      done: 'TERMINÉ',
      error: 'ERREUR',
      cancelled: 'ANNULÉ'
    }
    return statusMap[status] || status.toUpperCase()
  }

  const handleJobAction = async (jobId: string, action: 'duplicate' | 'delete') => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]

    if (!token) return

    try {
      if (action === 'duplicate') {
        await fetch(`/api/jobs/${jobId}/duplicate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      } else if (action === 'delete') {
        await fetch(`/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      }
      
      // Rafraîchir la liste
      fetchUserAndJobs()
    } catch (error) {
      console.error('Erreur action job:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#37A646' }}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1EF' }}>
      <Header user={user} currentPage="dashboard" />

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Dashboard</h2>
        </div>

        {/* Hero centré */}
        <section className="bg-white rounded-2xl shadow p-8 mb-8 text-center">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <img src="/icon.png" alt="AutoDino" width={24} height={24} />
            </div>
            <h3 className="text-xl font-semibold">Utiliser un Dino</h3>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              Lance une automatisation (un &quot;Dino&quot;) pour accomplir une tâche rapidement, ou découvre de nouveaux cas d&apos;usage.
            </p>
            <div className="mt-4">
              <Link 
                href="/use-cases" 
                className="px-5 py-2.5 rounded-lg text-white font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: '#37A646' }}
              >
                Configurer un Dino
              </Link>
            </div>
          </div>
        </section>

        {/* History section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Mes automatisations</h3>
            <button 
              onClick={fetchUserAndJobs}
              className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 text-sm transition-colors"
            >
              Rafraîchir
            </button>
          </div>
          
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="text-sm text-gray-500">Aucune automatisation pour le moment.</div>
            ) : (
              jobs.map((job) => (
                <div 
                  key={job.id}
                  className="bg-white rounded-2xl shadow p-5 relative border border-emerald-600/20 hover:border-emerald-600/40 transition cursor-pointer"
                  onClick={() => {
                    const route = job.kind === 'Email Extractor' 
                      ? `/email-extractor/${job.id}` 
                      : (job.kind === 'Nettoyeur de doublons' || job.kind === 'Détecteur de doublons') 
                        ? `/duplicate-cleaner/${job.id}` 
                        : job.kind === 'Find Website' 
                          ? `/find-website/${job.id}` 
                          : `/email-extractor/${job.id}`
                    router.push(route)
                  }}
                >
                  <div className="flex items-start">
                    <div className="flex-1 pr-8">
                      <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                        <img src="/icon.png" alt="AutoDino" width={18} height={18} />
                      </div>
                      <div className="text-xs uppercase tracking-wide text-emerald-700/80">{job.kind}</div>
                      <div className="text-lg font-semibold mt-0.5">{job.name}</div>
                      <div className="text-xs text-gray-600 mt-2">
                        <span className="font-medium text-gray-800">Statut:</span> {formatStatus(job.status)}
                        <span className="mx-1">•</span>
                        <span className="text-gray-500">{job.processedSites}/{job.totalSites} lignes</span>
                        <span className="mx-1">•</span>
                        <span className="text-gray-500">{job.emailsFound} emails</span>
                      </div>
                    </div>
                    <div className="ml-auto relative">
                      <button 
                        className="px-2 py-1 rounded hover:bg-black/5"
                        onClick={(e) => {
                          e.stopPropagation()
                          const menu = e.currentTarget.nextElementSibling as HTMLElement
                          menu.classList.toggle('hidden')
                        }}
                      >
                        …
                      </button>
                      <div className="hidden absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow p-1 z-50">
                        <button 
                          className="block w-full text-left text-sm px-3 py-1.5 hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleJobAction(job.id, 'duplicate')
                          }}
                        >
                          Dupliquer
                        </button>
                        <button 
                          className="block w-full text-left text-sm px-3 py-1.5 hover:bg-gray-100"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const newName = prompt('Nouveau nom de l\'automatisation:', job.name)
                            if (!newName) return
                            const token = document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1]
                            if (!token) return
                            await fetch(`/api/jobs/${job.id}/rename`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) })
                            fetchUserAndJobs()
                          }}
                        >
                          Renommer
                        </button>
                        <button 
                          className="block w-full text-left text-sm px-3 py-1.5 hover:bg-gray-100 text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleJobAction(job.id, 'delete')
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}