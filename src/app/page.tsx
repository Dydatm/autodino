'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]

    if (token) {
      // Utilisateur connecté, rediriger vers dashboard
      router.push('/dashboard')
    } else {
      // Utilisateur non connecté, rediriger vers login
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F1EF' }}>
      <div className="text-center">
        <div className="mx-auto h-16 w-16 rounded-xl bg-white shadow-lg flex items-center justify-center mb-4">
          <Image src="/icon.png" alt="AutoDino" width={40} height={40} className="rounded-lg" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AutoDino</h1>
        <p className="text-gray-600">Redirection en cours...</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#37A646' }}></div>
        </div>
      </div>
    </div>
  )
}
