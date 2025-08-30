'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import type { User } from '@/types/auth'
import type { Job, JobProgress } from '@/types/jobs'

export default function JobPage() {
  const [user, setUser] = useState<User | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [selectedColumn, setSelectedColumn] = useState('')
  const [jobName, setJobName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [showStep2, setShowStep2] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<JobProgress | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  useEffect(() => {
    fetchUserAndJob()
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [jobId])

  const fetchUserAndJob = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      if (!token) {
        router.push('/login')
        return
      }

      // Récupérer l'utilisateur
      const userResponse = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!userResponse.ok) {
        router.push('/login')
        return
      }

      const userData = await userResponse.json()
      setUser(userData.user)

      // Récupérer le job
      const jobResponse = await fetch(`/api/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (jobResponse.ok) {
        const jobData = await jobResponse.json()
        const jobInfo = jobData.job
        setJob(jobInfo)
        setJobName(jobInfo.name || 'Email Extractor')
        setColumns(jobInfo.columns || [])
        setSelectedColumn(jobInfo.selectedColumn || '')
        
        if (jobInfo.preppedInputPath) {
          setShowStep2(true)
          startProgressPolling(token)
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const startProgressPolling = (token: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/progress/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        
        if (response.ok) {
          const data = await response.json()
          setProgress(data)
          setIsRunning(data.status === 'running')
          
          if (data.status === 'done' || data.status === 'error' || data.status === 'cancelled') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            setIsRunning(false)
          }
        }
      } catch (error) {
        console.error('Erreur polling:', error)
      }
    }, 600)
  }



  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setError('')
  }

  // Upload automatique dès qu'un fichier est sélectionné
  useEffect(() => {
    if (selectedFile) {
      // Lance l'upload sans action utilisateur
      void handleUpload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile])

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError('')

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      if (!token) return

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('job_id', jobId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })

      const data = await response.json()
      
      if (data.success) {
        setColumns(data.columns || [])
        await fetchUserAndJob() // Rafraîchir les données du job
      } else {
        setError(data.message || 'Erreur lors de l\'upload')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      setError('Erreur de connexion au serveur')
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfigure = async () => {
    if (!selectedColumn) {
      setError('Veuillez sélectionner une colonne')
      return
    }

    setIsConfiguring(true)
    setError('')

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      if (!token) return

      const response = await fetch('/api/configure', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          name: jobName,
          urlColumn: selectedColumn,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setShowStep2(true)
        await fetchUserAndJob()
        startProgressPolling(token)
      } else {
        setError(data.message || 'Erreur lors de la configuration')
      }
    } catch (error) {
      console.error('Erreur configuration:', error)
      setError('Erreur de connexion au serveur')
    } finally {
      setIsConfiguring(false)
    }
  }

  const handleStart = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      if (!token) return

      const response = await fetch('/api/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId }),
      })

      if (response.ok) {
        setIsRunning(true)
        startProgressPolling(token)
      }
    } catch (error) {
      console.error('Erreur démarrage:', error)
    }
  }

  const handleStop = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      if (!token) return

      await fetch('/api/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId }),
      })

      setIsRunning(false)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    } catch (error) {
      console.error('Erreur arrêt:', error)
    }
  }

  const handleBackToStep1 = () => {
    setShowStep2(false)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setIsRunning(false)
    setProgress(null)
  }

  if (!user || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#37A646' }}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1EF' }}>
      <Header user={user} />

      <main className="max-w-7xl mx-auto p-6">
        {/* Step 1 - Configuration */}
        {!showStep2 && (
          <section className="bg-white rounded-2xl shadow p-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-semibold">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditingName(false)
                      }}
                      className="bg-transparent border-b-2 border-green-500 outline-none"
                      autoFocus
                    />
                  ) : (
                    jobName
                  )}
                </div>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="p-2 rounded-md hover:bg-black/5 transition"
                  title="Renommer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92.83l8.99-8.99 1.62 1.62-8.99 8.99H5.92v-1.62ZM20.71 7.04c.39-.39.39-1.02 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <h2 className="text-lg font-semibold mb-1">Étape 1 — Configuration</h2>
            <p className="text-sm text-gray-500 mb-4">
              Nomme, dépose ton CSV, choisis la colonne des URLs, puis termine la configuration.
            </p>

            <div className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm mb-1">Fichier CSV</label>
                <div 
                  className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const files = e.dataTransfer.files
                    if (files && files[0]) {
                      handleFileSelect(files[0])
                    }
                  }}
                >
                  <p className="font-medium">Dépose ton CSV ici</p>
                  <p className="text-xs text-gray-500">ou clique pour sélectionner…</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files
                      if (files && files[0]) {
                        handleFileSelect(files[0])
                      }
                    }}
                  />
                </div>
                {selectedFile && (
                  <p className="text-xs text-gray-500 mt-1">{selectedFile.name}</p>
                )}
              </div>

              {selectedFile && (
                <div>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: '#37A646' }}
                  >
                    {isUploading ? 'Upload en cours...' : 'Uploader le fichier'}
                  </button>
                </div>
              )}

              {columns.length > 0 && (
                <div>
                  <label className="block text-sm mb-1">Colonne contenant les URLs</label>
                  <select 
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Sélectionner une colonne...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={handleConfigure}
                  disabled={!selectedColumn || isConfiguring}
                  className="px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: '#37A646' }}
                >
                  {isConfiguring ? 'Configuration...' : 'Terminer la configuration'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Step 2 - Exécution */}
        {showStep2 && (
          <section className="bg-white rounded-2xl shadow p-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-semibold">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditingName(false)
                      }}
                      className="bg-transparent border-b-2 border-green-500 outline-none"
                      autoFocus
                    />
                  ) : (
                    jobName
                  )}
                </div>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="p-2 rounded-md hover:bg-black/5 transition"
                  title="Renommer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92.83l8.99-8.99 1.62 1.62-8.99 8.99H5.92v-1.62ZM20.71 7.04c.39-.39.39-1.02 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/>
                  </svg>
                </button>
              </div>
              <button 
                onClick={handleBackToStep1}
                className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                ← Retour
              </button>
            </div>
            
            <h2 className="text-lg font-semibold mb-1">Étape 2 — Exécution</h2>
            <p className="text-sm text-gray-500 mb-4">
              Lance et suis la progression en direct. Télécharge le résultat une fois terminé.
            </p>

            <div className="space-y-4">
              {/* Barre de progression */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Progression</span>
                  <span className="text-sm text-gray-600">{progress?.percent || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${progress?.percent || 0}%`,
                      backgroundColor: '#37A646'
                    }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <span>{progress?.processedSites || 0}/{progress?.totalSites || 0} lignes</span>
                  <span className="mx-2">•</span>
                  <span>{progress?.emailsFound || 0} emails trouvés</span>
                  <span className="mx-2">•</span>
                  <span>{progress?.status?.toUpperCase() || 'EN ATTENTE'}</span>
                </div>
              </div>

              {/* Boutons de contrôle */}
              <div className="flex items-center gap-3">
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    disabled={job?.status !== 'ready'}
                    className="px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: '#37A646' }}
                  >
                    Lancer
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="px-4 py-2 rounded-lg border-2 bg-white hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#37A646', color: '#37A646' }}
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* Bouton de téléchargement */}
              {progress?.status === 'done' && (
                <div className="flex items-center gap-3">
                  <a
                    href={`/api/download/${jobId}`}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    download
                  >
                    Télécharger le résultat
                  </a>
                </div>
              )}

              {/* Logs */}
              <details className="mt-1">
                <summary className="cursor-pointer text-sm text-gray-700">Voir les logs</summary>
                <pre className="mt-2 text-xs bg-gray-900 text-gray-100 rounded-xl p-3 max-h-64 overflow-auto">
                  {progress?.log?.join('\n') || 'Aucun log disponible'}
                </pre>
              </details>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}