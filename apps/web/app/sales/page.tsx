'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SalesPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to invoices as the main sales functionality
    router.replace('/invoices')
  }, [router])

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Sales</h1>
      <p className="mt-2 text-sm text-slate-600">Redirecting to invoices...</p>
    </div>
  )
}


