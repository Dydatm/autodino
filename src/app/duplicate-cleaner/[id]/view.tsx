'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import type { User } from '@/types/auth'
import type { Job, JobProgress } from '@/types/jobs'

export default function DuplicateCleaner() {
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
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [jobId])

  const fetchUserAndJob = async () => {
    try {
      const token = document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1]
      if (!token) { router.push('/login'); return }

      const userResponse = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
      if (!userResponse.ok) { router.push('/login'); return }
      const userData = await userResponse.json(); setUser(userData.user)

      const jobResponse = await fetch(`/api/jobs/${jobId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (jobResponse.ok) {
        const jobData = await jobResponse.json()
        const jobInfo = jobData.job as Job
        setJob(jobInfo)
        setJobName(jobInfo.name || 'Nettoyeur de doublons')
        setColumns(jobInfo.columns || [])
        setSelectedColumn(jobInfo.selectedColumn || '')
        if (jobInfo.preppedInputPath) { setShowStep2(true); startProgressPolling(token) }
      }
    } catch (e) { console.error(e) }
  }

  const startProgressPolling = (token: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/progress/${jobId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setProgress(data); setIsRunning(data.status === 'running')
          if (['done','error','cancelled'].includes(data.status)) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null; setIsRunning(false)
          }
        }
      } catch {}
    }, 600)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true); setError('')
    try {
      const token = document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1]
      if (!token) return
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('job_id', jobId)
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData })
      const data = await res.json()
      if (data.success) { setColumns(data.columns || []); await fetchUserAndJob() } else { setError(data.message || 'Erreur upload') }
    } catch { setError('Erreur de connexion au serveur') } finally { setIsUploading(false) }
  }

  // Upload automatique dès qu'un fichier est sélectionné
  useEffect(() => {
    if (selectedFile) {
      void handleUpload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile])

  const handleConfigure = async () => {
    if (!selectedColumn) { setError('Veuillez sélectionner une colonne'); return }
    setIsConfiguring(true); setError('')
    try {
      const token = document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1]
      if (!token) return
      const res = await fetch('/api/configure', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, name: jobName, column: selectedColumn }),
      })
      const data = await res.json()
      if (data.success) { setShowStep2(true); await fetchUserAndJob(); startProgressPolling(token) } else { setError(data.message || 'Erreur configuration') }
    } catch { setError('Erreur de connexion au serveur') } finally { setIsConfiguring(false) }
  }

  const handleStart = async () => {
    try {
      const token = document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1]
      if (!token) return
      const res = await fetch('/api/start', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId }) })
      if (res.ok) { setIsRunning(true); startProgressPolling(token) }
    } catch {}
  }

  if (!user || !job) return (<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#37A646' }}></div></div>)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1EF' }}>
      <Header user={user} />
      <main className="max-w-7xl mx-auto p-6">
        {!showStep2 && (
          <section className="bg-white rounded-2xl shadow p-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-semibold">
                  {isEditingName ? (
                    <input type="text" value={jobName} onChange={(e)=>setJobName(e.target.value)} onBlur={()=>setIsEditingName(false)} onKeyDown={(e)=>{ if(e.key==='Enter') setIsEditingName(false)}} className="bg-transparent border-b-2 border-green-500 outline-none" autoFocus />
                  ) : (jobName)}
                </div>
                <button onClick={()=>setIsEditingName(true)} className="p-2 rounded-md hover:bg-black/5 transition" title="Renommer">
                  ✏️
                </button>
              </div>
            </div>
            <h2 className="text-lg font-semibold mb-1">Étape 1 — Configuration</h2>
            <p className="text-sm text-gray-500 mb-4">Nomme, dépose ton CSV/XLSX, choisis la colonne à dédupliquer, puis termine la configuration.</p>
            <div className="space-y-5">
              {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>)}
              <div>
                <label className="block text-sm mb-1">Fichier CSV/XLSX</label>
                <div className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer" onClick={()=>fileInputRef.current?.click()}>
                  <p className="font-medium">Dépose ton fichier ici</p>
                  <p className="text-xs text-gray-500">ou clique pour sélectionner…</p>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) setSelectedFile(f)}} />
                </div>
                {selectedFile && (<p className="text-xs text-gray-500 mt-1">{selectedFile.name}</p>)}
              </div>
              {/* Upload auto: pas de bouton nécessaire */}
              {columns.length>0 && (
                <div>
                  <label className="block text-sm mb-1">Colonne à dédupliquer</label>
                  <select value={selectedColumn} onChange={(e)=>setSelectedColumn(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                    <option value="">Sélectionner une colonne...</option>
                    {columns.map((c)=> (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={handleConfigure} disabled={!selectedColumn || isConfiguring} className="px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors" style={{ backgroundColor: '#37A646' }}>{isConfiguring ? 'Configuration...' : 'Terminer la configuration'}</button>
              </div>
            </div>
          </section>
        )}
        {showStep2 && (
          <section className="bg-white rounded-2xl shadow p-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-semibold">{jobName}</div>
              </div>
              <button onClick={()=>{ setShowStep2(false); if(pollIntervalRef.current){ clearInterval(pollIntervalRef.current); pollIntervalRef.current=null } }} className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100">← Retour</button>
            </div>
            <h2 className="text-lg font-semibold mb-1">Étape 2 — Exécution</h2>
            <p className="text-sm text-gray-500 mb-4">Lance et télécharge le résultat nettoyé.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {!isRunning ? (
                  <button onClick={handleStart} disabled={job?.status !== 'ready'} className="px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors" style={{ backgroundColor: '#37A646' }}>Lancer</button>
                ) : (
                  <span className="text-sm text-gray-600">Traitement en cours…</span>
                )}
              </div>
              {progress?.status === 'done' && (
                <div className="flex items-center gap-3">
                  <a href={`/api/download/${jobId}`} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" download>Télécharger le résultat</a>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}


