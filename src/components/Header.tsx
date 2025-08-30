'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { User } from '@/types/auth'

interface HeaderProps {
  user?: User | null
  currentPage?: 'dashboard' | 'use-cases'
}

export default function Header({ user, currentPage = 'dashboard' }: HeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/login')
  }

  return (
    <header className="w-full bg-white shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center gap-6 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-md bg-green-50 flex items-center justify-center">
            <Image src="/icon.png" alt="AutoDino" width={24} height={24} />
          </div>
          <h1 className="text-2xl font-bold">AutoDino</h1>
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link 
            href="/dashboard" 
            className={`text-sm hover:text-gray-900 transition-colors ${
              currentPage === 'dashboard' ? 'text-gray-900 font-medium' : 'text-gray-700'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/use-cases" 
            className={`text-sm hover:text-gray-900 transition-colors ${
              currentPage === 'use-cases' ? 'text-gray-900 font-medium' : 'text-gray-700'
            }`}
          >
            Use cases
          </Link>
        </nav>
        
        {user && (
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-gray-700">
              Bonjour {user.firstname || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  )
}