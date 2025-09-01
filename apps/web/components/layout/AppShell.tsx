'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

const PUBLIC_ROUTES = ['/', '/login', '/register']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isAuthed, setIsAuthed] = useState<boolean>(false)

  useEffect(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      setIsAuthed(!!token)
    } catch {
      setIsAuthed(false)
    }
  }, [pathname])

  const isPublic = PUBLIC_ROUTES.includes(pathname || '/')

  if (isPublic || !isAuthed) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  )
}


